-- Multi-event support: create showcase_events table and add event_id to all operational tables

-- 1. Event type enum
CREATE TYPE showcase_event_type AS ENUM ('showcase', 'id_camp', 'futures');

-- 2. Showcase events table
CREATE TABLE showcase_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME DEFAULT '09:00:00',
  description TEXT,
  type showcase_event_type NOT NULL DEFAULT 'showcase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (open, same as other tables)
ALTER TABLE showcase_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on showcase_events" ON showcase_events FOR ALL USING (true) WITH CHECK (true);

-- 3. Insert default event for existing data
INSERT INTO showcase_events (id, name, slug, location, start_date, end_date, start_time, description, type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'College Pro Showcase Germany',
  'cologne-2026',
  'Cologne, Germany',
  '2026-02-07',
  '2026-02-08',
  '09:00:00',
  'The original College Pro Showcase Germany event, February 7-8, 2026 in Cologne.',
  'showcase'
);

-- 4. Add event_id column to all operational tables (nullable first, then backfill, then NOT NULL)

-- showcase_tasks
ALTER TABLE showcase_tasks ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_tasks SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_tasks ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_tasks_event ON showcase_tasks(event_id);

-- showcase_comments
ALTER TABLE showcase_comments ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_comments SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_comments ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_comments_event ON showcase_comments(event_id);

-- showcase_announcements
ALTER TABLE showcase_announcements ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_announcements SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_announcements ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_announcements_event ON showcase_announcements(event_id);

-- showcase_milestones
ALTER TABLE showcase_milestones ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_milestones SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_milestones ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_milestones_event ON showcase_milestones(event_id);

-- showcase_activity
ALTER TABLE showcase_activity ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_activity SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_activity ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_activity_event ON showcase_activity(event_id);

-- showcase_attendees
ALTER TABLE showcase_attendees ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_attendees SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_attendees ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_attendees_event ON showcase_attendees(event_id);

-- showcase_players
ALTER TABLE showcase_players ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_players SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_players ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_players_event ON showcase_players(event_id);

-- showcase_day_groups
ALTER TABLE showcase_day_groups ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_day_groups SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_day_groups ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_day_groups_event ON showcase_day_groups(event_id);

-- showcase_day_activities
ALTER TABLE showcase_day_activities ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_day_activities SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_day_activities ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_day_activities_event ON showcase_day_activities(event_id);

-- showcase_matches
ALTER TABLE showcase_matches ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_matches SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_matches ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_matches_event ON showcase_matches(event_id);

-- showcase_materials
ALTER TABLE showcase_materials ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_materials SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_materials ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_materials_event ON showcase_materials(event_id);

-- showcase_feedback
ALTER TABLE showcase_feedback ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_feedback SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_feedback ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_feedback_event ON showcase_feedback(event_id);

-- showcase_venue_zones
ALTER TABLE showcase_venue_zones ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_venue_zones SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_venue_zones ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_venue_zones_event ON showcase_venue_zones(event_id);

-- showcase_venue_settings
ALTER TABLE showcase_venue_settings ADD COLUMN event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE;
UPDATE showcase_venue_settings SET event_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE showcase_venue_settings ALTER COLUMN event_id SET NOT NULL;
CREATE INDEX idx_showcase_venue_settings_event ON showcase_venue_settings(event_id);
