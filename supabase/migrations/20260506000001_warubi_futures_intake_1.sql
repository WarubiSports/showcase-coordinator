-- Warubi Futures - Intake 1 (May 12-22, 2026)
-- 1) Seed event in showcase_events
-- 2) Trigger: auto-sync confirmed/selected applicants from futures_applications -> showcase_players
-- 3) One-off backfill of existing matching applicants
--
-- Trigger only ADDS rows. If a status flips back to pending/declined, the matching
-- showcase_players row is NOT removed automatically. Remove manually if needed.

-- 1) Seed event
INSERT INTO showcase_events (name, slug, location, start_date, end_date, type, accent_color)
VALUES (
  'Warubi Futures - Intake 1',
  'futures-intake-1',
  'Widdersdorf, Köln, Germany',
  '2026-05-12',
  '2026-05-22',
  'futures',
  '#A855F7'
)
ON CONFLICT (slug) DO NOTHING;

-- 2) Trigger function
CREATE OR REPLACE FUNCTION sync_futures_applicant_to_showcase_player()
RETURNS TRIGGER AS $$
DECLARE
  ev_id uuid;
  player_birth_year int;
BEGIN
  IF NEW.status NOT IN ('selected','confirmed') THEN
    RETURN NEW;
  END IF;
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
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_futures_applicant_to_showcase_player_trigger ON futures_applications;
CREATE TRIGGER sync_futures_applicant_to_showcase_player_trigger
AFTER INSERT OR UPDATE OF status, intake ON futures_applications
FOR EACH ROW
EXECUTE FUNCTION sync_futures_applicant_to_showcase_player();

-- 3) Backfill. DISTINCT ON (email) collapses duplicate applications (same person, two rows).
INSERT INTO showcase_players (
  event_id, name, position, birth_year, club, country,
  email, phone, parent_name, parent_email, notes, created_by
)
SELECT DISTINCT ON (fa.email)
  (SELECT id FROM showcase_events WHERE slug = 'futures-intake-1'),
  TRIM(fa.first_name) || ' ' || TRIM(fa.last_name),
  fa.position,
  COALESCE(
    EXTRACT(YEAR FROM fa.date_of_birth)::int,
    EXTRACT(YEAR FROM CURRENT_DATE)::int - fa.age
  ),
  fa.current_level,
  fa.nationality,
  fa.email,
  fa.phone,
  fa.parent_name,
  fa.parent_email,
  'Synced from Futures application ' || fa.id::text,
  'futures-trigger'
FROM futures_applications fa
WHERE fa.intake IN ('intake1','both')
  AND fa.status IN ('selected','confirmed')
  AND NOT EXISTS (
    SELECT 1 FROM showcase_players sp
    WHERE sp.event_id = (SELECT id FROM showcase_events WHERE slug = 'futures-intake-1')
      AND sp.email = fa.email
  )
ORDER BY fa.email, fa.created_at DESC;
