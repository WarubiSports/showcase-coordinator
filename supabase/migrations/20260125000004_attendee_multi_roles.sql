-- Allow multiple roles per attendee
-- Change role (single text) to roles (jsonb array)

-- Add new roles column
ALTER TABLE showcase_attendees ADD COLUMN IF NOT EXISTS roles jsonb DEFAULT '[]';

-- Migrate existing role data to roles array
UPDATE showcase_attendees SET roles = jsonb_build_array(role) WHERE role IS NOT NULL AND roles = '[]';

-- Drop the old role column
ALTER TABLE showcase_attendees DROP COLUMN IF EXISTS role;
