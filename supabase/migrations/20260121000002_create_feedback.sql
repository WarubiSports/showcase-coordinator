-- Feedback table for user submissions
CREATE TABLE IF NOT EXISTS showcase_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'idea', 'other')),
  description TEXT NOT NULL,
  details TEXT,
  importance TEXT NOT NULL CHECK (importance IN ('nice_to_have', 'helpful', 'important', 'critical')),
  page_url TEXT,
  screenshot_url TEXT,
  ai_prompt TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'done', 'dismissed')),
  submitted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_feedback_status ON showcase_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON showcase_feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON showcase_feedback(created_at DESC);

-- RLS
ALTER TABLE showcase_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on feedback" ON showcase_feedback FOR ALL USING (true) WITH CHECK (true);
