-- College Pro Showcase Germany - Team Coordinator Schema
-- Run this migration in your Supabase SQL Editor

-- Categories (seeded with initial values)
CREATE TABLE IF NOT EXISTS showcase_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- hex color for UI
  icon TEXT, -- optional icon name
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS showcase_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES showcase_categories(id),
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, blocked, complete
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  assignee TEXT, -- name string (no user accounts)
  deadline DATE,
  progress INT DEFAULT 0, -- 0-100 percentage
  dependencies UUID[], -- array of task IDs this depends on
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Comments (threaded on tasks)
CREATE TABLE IF NOT EXISTS showcase_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES showcase_tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements (org-wide messages)
CREATE TABLE IF NOT EXISTS showcase_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones (for timeline)
CREATE TABLE IF NOT EXISTS showcase_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log (for tracking changes)
CREATE TABLE IF NOT EXISTS showcase_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'task', 'announcement', 'milestone'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'commented', 'status_changed'
  actor TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_category ON showcase_tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON showcase_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON showcase_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_comments_task ON showcase_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON showcase_activity(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON showcase_activity(created_at DESC);

-- Enable Row Level Security (but allow all operations for this app)
ALTER TABLE showcase_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_activity ENABLE ROW LEVEL SECURITY;

-- Policies to allow all operations (no auth required for this app)
CREATE POLICY "Allow all operations on categories" ON showcase_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tasks" ON showcase_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on comments" ON showcase_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on announcements" ON showcase_announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on milestones" ON showcase_milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on activity" ON showcase_activity FOR ALL USING (true) WITH CHECK (true);

-- Seed categories
INSERT INTO showcase_categories (name, color, icon, sort_order) VALUES
  ('Logistics', '#3B82F6', 'truck', 1),
  ('Marketing', '#8B5CF6', 'megaphone', 2),
  ('Player Registration', '#22C55E', 'users', 3),
  ('Coach/Recruiter Coordination', '#F97316', 'clipboard', 4),
  ('Venue', '#EF4444', 'map-pin', 5),
  ('Catering', '#EAB308', 'utensils', 6),
  ('Staffing', '#14B8A6', 'user-check', 7),
  ('Travel & Accommodation', '#6366F1', 'plane', 8),
  ('Content & Media', '#EC4899', 'camera', 9);

-- Seed initial milestones
INSERT INTO showcase_milestones (title, description, target_date, sort_order) VALUES
  ('Venue Confirmed', 'Finalize venue booking and contracts', '2025-12-01', 1),
  ('Registration Opens', 'Open player registration portal', '2025-12-15', 2),
  ('Marketing Launch', 'Launch social media campaign', '2026-01-01', 3),
  ('Registration Closes', 'Close player registration', '2026-01-25', 4),
  ('Final Prep Week', 'All logistics finalized', '2026-02-01', 5),
  ('Event Day 1', 'College Pro Showcase Germany', '2026-02-07', 6),
  ('Event Day 2', 'College Pro Showcase Germany', '2026-02-08', 7);
