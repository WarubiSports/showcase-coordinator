-- Add show_on_schedule column to showcase_tasks
-- Default true for backward compatibility (existing scheduled tasks will show)
ALTER TABLE showcase_tasks
ADD COLUMN IF NOT EXISTS show_on_schedule BOOLEAN DEFAULT true;

COMMENT ON COLUMN showcase_tasks.show_on_schedule IS 'Whether this task appears on the schedule calendar when scheduled';
