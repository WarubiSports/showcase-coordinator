-- Day Schedule - Granular day-by-day coordination for event days
-- Friday (Kick-off), Saturday (Day 1), Sunday (Day 2)

-- Groups for organizing activities
CREATE TABLE IF NOT EXISTS showcase_day_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Day activities - time slots with activities
CREATE TABLE IF NOT EXISTS showcase_day_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  group_id UUID REFERENCES showcase_day_groups(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME,
  activity TEXT NOT NULL,
  responsible TEXT,
  todos TEXT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match schedule - game pairings
CREATE TABLE IF NOT EXISTS showcase_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  match_number INT NOT NULL,
  start_time TIME NOT NULL,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  field TEXT,
  referee TEXT,
  score_a INT,
  score_b INT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material checklist
CREATE TABLE IF NOT EXISTS showcase_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT NOT NULL,
  category TEXT, -- e.g., 'equipment', 'signage', 'catering', etc.
  is_ready BOOLEAN DEFAULT FALSE,
  responsible TEXT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_day_activities_date ON showcase_day_activities(event_date);
CREATE INDEX IF NOT EXISTS idx_day_activities_group ON showcase_day_activities(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON showcase_matches(event_date);
CREATE INDEX IF NOT EXISTS idx_materials_ready ON showcase_materials(is_ready);

-- Enable RLS
ALTER TABLE showcase_day_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_day_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_materials ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth required)
CREATE POLICY "Allow all on day_groups" ON showcase_day_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on day_activities" ON showcase_day_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on matches" ON showcase_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on materials" ON showcase_materials FOR ALL USING (true) WITH CHECK (true);

-- Seed groups based on Excel structure
INSERT INTO showcase_day_groups (name, color, sort_order) VALUES
  ('Group 1', '#3B82F6', 1),
  ('Group 2', '#22C55E', 2),
  ('Coaches', '#F97316', 3),
  ('Girls (Testing First)', '#EC4899', 4),
  ('Goalkeepers (Testing Last)', '#8B5CF6', 5),
  ('General', '#6B7280', 6);
