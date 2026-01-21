-- Add scheduled_date and scheduled_time columns to showcase_tasks
-- This allows tasks to appear on the schedule calendar

ALTER TABLE showcase_tasks
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Create index for efficient schedule queries
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON showcase_tasks(scheduled_date);

COMMENT ON COLUMN showcase_tasks.scheduled_date IS 'Date when the task is scheduled to occur (for calendar view)';
COMMENT ON COLUMN showcase_tasks.scheduled_time IS 'Time when the task is scheduled (for calendar view)';
