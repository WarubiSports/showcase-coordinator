-- Add rotation support to venue zones
ALTER TABLE showcase_venue_zones ADD COLUMN IF NOT EXISTS rotation INT DEFAULT 0;
