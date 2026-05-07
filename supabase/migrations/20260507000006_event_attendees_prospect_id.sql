-- Allow event_attendees rows to reference a trial_prospect (Futures, Female Camp,
-- ITP-pre-promotion) in addition to a player. Exactly one of (player_id, prospect_id)
-- must be set. UNIQUE constraint widened to cover both.

ALTER TABLE event_attendees
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES trial_prospects(id) ON DELETE CASCADE;

ALTER TABLE event_attendees
  ALTER COLUMN player_id DROP NOT NULL;

-- Drop the old unique constraint that assumed player_id is always present
ALTER TABLE event_attendees
  DROP CONSTRAINT IF EXISTS event_attendees_event_id_player_id_key;

-- Replace with two partial-unique indexes: one per attendee kind
CREATE UNIQUE INDEX IF NOT EXISTS event_attendees_event_player_uniq
  ON event_attendees (event_id, player_id)
  WHERE player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_attendees_event_prospect_uniq
  ON event_attendees (event_id, prospect_id)
  WHERE prospect_id IS NOT NULL;

-- Exactly one of (player_id, prospect_id) must be set
ALTER TABLE event_attendees
  DROP CONSTRAINT IF EXISTS event_attendees_one_attendee_kind;
ALTER TABLE event_attendees
  ADD CONSTRAINT event_attendees_one_attendee_kind
  CHECK ((player_id IS NOT NULL) <> (prospect_id IS NOT NULL));
