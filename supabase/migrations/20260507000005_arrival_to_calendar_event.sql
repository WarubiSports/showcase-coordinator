-- When a Futures (or any program) prospect submits arrival info via the
-- onboarding portal, mirror it into the calendar as an airport_pickup event
-- so staff see it in /calendar without manual data entry.
--
-- Linked via events.source_prospect_id. Trigger upserts (insert/update/delete)
-- on changes to arrival fields. Times are interpreted as Europe/Berlin local.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS source_prospect_id uuid REFERENCES trial_prospects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS events_source_prospect_id_idx ON events(source_prospect_id);

CREATE OR REPLACE FUNCTION sync_prospect_arrival_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
  full_name text;
  arrival_ts timestamptz;
  desc_parts text[];
  desc_text text;
BEGIN
  -- No arrival info → ensure no event exists for this prospect
  IF NEW.arrival_date IS NULL OR NEW.arrival_time IS NULL THEN
    DELETE FROM events
    WHERE source_prospect_id = NEW.id AND type = 'airport_pickup';
    RETURN NEW;
  END IF;

  -- Compose the arrival timestamp (Berlin local → UTC for storage)
  BEGIN
    arrival_ts := (NEW.arrival_date::text || ' ' || NEW.arrival_time)::timestamp
                  AT TIME ZONE 'Europe/Berlin';
  EXCEPTION WHEN others THEN
    -- Bad time format (e.g. free text), skip rather than fail the prospect update
    RETURN NEW;
  END;

  full_name := TRIM(NEW.first_name) || ' ' || TRIM(NEW.last_name);

  desc_parts := ARRAY[]::text[];
  IF NEW.flight_number IS NOT NULL THEN
    desc_parts := array_append(desc_parts, 'Flight ' || NEW.flight_number);
  END IF;
  IF NEW.needs_pickup IS TRUE THEN
    desc_parts := array_append(desc_parts, 'Pickup needed');
  END IF;
  IF NEW.pickup_location IS NOT NULL THEN
    desc_parts := array_append(desc_parts, 'Drop at: ' || NEW.pickup_location);
  END IF;
  desc_text := array_to_string(desc_parts, ' · ');
  IF desc_text = '' THEN desc_text := NULL; END IF;

  -- Upsert: one airport_pickup event per prospect
  IF EXISTS (
    SELECT 1 FROM events WHERE source_prospect_id = NEW.id AND type = 'airport_pickup'
  ) THEN
    UPDATE events SET
      title = 'Pickup: ' || full_name,
      date = NEW.arrival_date,
      start_time = arrival_ts,
      end_time = arrival_ts + interval '1 hour',
      location = NEW.arrival_airport,
      description = desc_text,
      program = NEW.program,
      cohort = NEW.cohort,
      updated_at = now()
    WHERE source_prospect_id = NEW.id AND type = 'airport_pickup';
  ELSE
    INSERT INTO events (
      title, type, date, start_time, end_time, location, description,
      program, cohort, source_prospect_id, all_day, is_mandatory
    ) VALUES (
      'Pickup: ' || full_name,
      'airport_pickup',
      NEW.arrival_date,
      arrival_ts,
      arrival_ts + interval '1 hour',
      NEW.arrival_airport,
      desc_text,
      NEW.program,
      NEW.cohort,
      NEW.id,
      false,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_prospect_arrival_to_calendar_trigger ON trial_prospects;
CREATE TRIGGER sync_prospect_arrival_to_calendar_trigger
AFTER INSERT OR UPDATE OF arrival_date, arrival_time, arrival_airport, flight_number, needs_pickup, pickup_location ON trial_prospects
FOR EACH ROW
EXECUTE FUNCTION sync_prospect_arrival_to_calendar();

-- Backfill: re-fire the trigger for every prospect that already has arrival info
-- by touching arrival_date with itself.
UPDATE trial_prospects
SET arrival_date = arrival_date
WHERE arrival_date IS NOT NULL AND arrival_time IS NOT NULL;
