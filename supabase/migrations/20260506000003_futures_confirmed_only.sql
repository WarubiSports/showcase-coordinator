-- Tighten Futures sync to confirmed-only (was selected + confirmed).
-- "Confirmed" is the manual flip Max does after payment is received.

CREATE OR REPLACE FUNCTION sync_futures_applicant_to_showcase_player()
RETURNS TRIGGER AS $$
DECLARE
  ev_id uuid;
  player_birth_year int;
BEGIN
  IF NEW.status <> 'confirmed' THEN
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

-- Remove showcase_players rows for applicants no longer in the confirmed set.
-- Scoped tightly: only Intake 1 event, only trigger-created rows, only when no
-- confirmed application exists for that email under intake1/both.
DELETE FROM showcase_players sp
WHERE sp.event_id = (SELECT id FROM showcase_events WHERE slug = 'futures-intake-1')
  AND sp.created_by = 'futures-trigger'
  AND NOT EXISTS (
    SELECT 1 FROM futures_applications fa
    WHERE fa.email = sp.email
      AND fa.intake IN ('intake1','both')
      AND fa.status = 'confirmed'
  );
