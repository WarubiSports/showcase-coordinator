-- Replace status-based gate with an explicit `attending` boolean curated by Max.
-- Roster trigger now adds when attending flips false->true and removes when true->false.
-- Status enum is left untouched (still drives selection/payment-link emails).

ALTER TABLE futures_applications
  ADD COLUMN IF NOT EXISTS attending boolean NOT NULL DEFAULT false;

-- Backfill: anyone currently in the Intake 1 roster keeps their seat.
UPDATE futures_applications fa
SET attending = true
WHERE fa.intake IN ('intake1','both')
  AND EXISTS (
    SELECT 1 FROM showcase_players sp
    WHERE sp.event_id = (SELECT id FROM showcase_events WHERE slug = 'futures-intake-1')
      AND sp.email = fa.email
      AND sp.created_by = 'futures-trigger'
  );

CREATE OR REPLACE FUNCTION sync_futures_applicant_to_showcase_player()
RETURNS TRIGGER AS $$
DECLARE
  ev_id uuid;
  player_birth_year int;
BEGIN
  IF NEW.intake NOT IN ('intake1','both') THEN
    RETURN NEW;
  END IF;

  SELECT id INTO ev_id
  FROM showcase_events
  WHERE slug = 'futures-intake-1'
  LIMIT 1;

  IF ev_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- attending flipped to true: add to roster (idempotent on event_id+email)
  IF NEW.attending = true THEN
    IF EXISTS (
      SELECT 1 FROM showcase_players
      WHERE event_id = ev_id AND email = NEW.email
    ) THEN
      RETURN NEW;
    END IF;

    IF NEW.date_of_birth IS NOT NULL THEN
      player_birth_year := EXTRACT(YEAR FROM NEW.date_of_birth)::int;
    ELSIF NEW.age IS NOT NULL THEN
      player_birth_year := EXTRACT(YEAR FROM CURRENT_DATE)::int - NEW.age;
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
      NEW.current_level,
      NEW.nationality,
      NEW.email,
      NEW.phone,
      NEW.parent_name,
      NEW.parent_email,
      'Synced from Futures application ' || NEW.id::text,
      'futures-trigger'
    );

    RETURN NEW;
  END IF;

  -- attending flipped to false: remove from roster (only trigger-created rows)
  IF NEW.attending = false THEN
    DELETE FROM showcase_players
    WHERE event_id = ev_id
      AND email = NEW.email
      AND created_by = 'futures-trigger';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_futures_applicant_to_showcase_player_trigger ON futures_applications;
CREATE TRIGGER sync_futures_applicant_to_showcase_player_trigger
AFTER INSERT OR UPDATE OF attending, intake ON futures_applications
FOR EACH ROW
EXECUTE FUNCTION sync_futures_applicant_to_showcase_player();
