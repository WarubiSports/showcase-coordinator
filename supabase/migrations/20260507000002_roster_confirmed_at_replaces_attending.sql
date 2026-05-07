-- Replace `futures_applications.attending` gate (added earlier today) with
-- `trial_prospects.roster_confirmed_at`. The new gate is controlled in Warubi Ops
-- (ITP-Staff-App) on the futures-applications page via a "Confirm Spot" button.
-- This separates "spot in the camp" (roster_confirmed_at) from "money received"
-- (payment_status), so locals/freebies can be in the roster without being marked paid.

-- 1) Add new gate column on trial_prospects
ALTER TABLE trial_prospects
  ADD COLUMN IF NOT EXISTS roster_confirmed_at timestamptz;

-- 2) Backfill: anyone currently in showcase_players for Intake 1 (created via the
--    old futures_applications.attending trigger) keeps their seat.
UPDATE trial_prospects tp
SET roster_confirmed_at = now()
WHERE tp.roster_confirmed_at IS NULL
  AND tp.id IN (
    SELECT fa.promoted_prospect_id
    FROM futures_applications fa
    WHERE fa.intake IN ('intake1','both')
      AND fa.promoted_prospect_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM showcase_players sp
        WHERE sp.event_id = (SELECT id FROM showcase_events WHERE slug = 'futures-intake-1')
          AND sp.email = fa.email
          AND sp.created_by = 'futures-trigger'
      )
  );

-- 3) Drop old trigger + function (gated on futures_applications.attending)
DROP TRIGGER IF EXISTS sync_futures_applicant_to_showcase_player_trigger ON futures_applications;
DROP FUNCTION IF EXISTS sync_futures_applicant_to_showcase_player();

-- 4) Drop the now-unused attending column
ALTER TABLE futures_applications DROP COLUMN IF EXISTS attending;

-- 5) New trigger function on trial_prospects, gated on roster_confirmed_at.
--    Joins back to futures_applications via promoted_prospect_id to determine intake
--    (only Intake 1 applicants land in the futures-intake-1 showcase event).
CREATE OR REPLACE FUNCTION sync_prospect_to_showcase_player()
RETURNS TRIGGER AS $$
DECLARE
  ev_id uuid;
  fa_record record;
  player_birth_year int;
BEGIN
  SELECT id INTO ev_id FROM showcase_events WHERE slug = 'futures-intake-1' LIMIT 1;
  IF ev_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Removal path: roster_confirmed_at flipped from set -> null
  IF NEW.roster_confirmed_at IS NULL THEN
    IF (TG_OP = 'UPDATE' AND OLD.roster_confirmed_at IS NOT NULL) THEN
      DELETE FROM showcase_players
      WHERE event_id = ev_id
        AND email = NEW.email
        AND created_by = 'futures-trigger';
    END IF;
    RETURN NEW;
  END IF;

  -- Addition path: only act for Futures Intake 1 prospects (intake1 or both)
  SELECT * INTO fa_record FROM futures_applications
    WHERE promoted_prospect_id = NEW.id
    LIMIT 1;
  IF fa_record IS NULL THEN
    RETURN NEW;  -- not a Futures applicant (other ITP path); no roster action
  END IF;
  IF fa_record.intake NOT IN ('intake1','both') THEN
    RETURN NEW;
  END IF;

  -- Idempotent insert
  IF EXISTS (
    SELECT 1 FROM showcase_players
    WHERE event_id = ev_id AND email = NEW.email
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.date_of_birth IS NOT NULL THEN
    player_birth_year := EXTRACT(YEAR FROM NEW.date_of_birth)::int;
  END IF;

  INSERT INTO showcase_players (
    event_id, name, position, birth_year, club, country,
    email, phone, parent_name, parent_email,
    notes, created_by
  ) VALUES (
    ev_id,
    TRIM(NEW.first_name) || ' ' || TRIM(NEW.last_name),
    NEW.position,
    player_birth_year,
    fa_record.current_level,
    NEW.nationality,
    NEW.email,
    NEW.phone,
    NEW.parent_name,
    NEW.parent_contact,
    'Synced from Futures application ' || fa_record.id::text,
    'futures-trigger'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_prospect_to_showcase_player_trigger ON trial_prospects;
CREATE TRIGGER sync_prospect_to_showcase_player_trigger
AFTER INSERT OR UPDATE OF roster_confirmed_at ON trial_prospects
FOR EACH ROW
EXECUTE FUNCTION sync_prospect_to_showcase_player();
