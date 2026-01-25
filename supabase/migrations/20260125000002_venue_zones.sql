-- Venue Map Zones - Mark areas on the venue map
CREATE TABLE IF NOT EXISTS showcase_venue_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  -- Zone coordinates as percentage of image (0-100)
  x DECIMAL NOT NULL,
  y DECIMAL NOT NULL,
  width DECIMAL NOT NULL,
  height DECIMAL NOT NULL,
  -- Optional link to activity type
  zone_type TEXT, -- 'field', 'registration', 'catering', 'medical', 'parking', 'other'
  sort_order INT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venue image settings
CREATE TABLE IF NOT EXISTS showcase_venue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  image_width INT,
  image_height INT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE showcase_venue_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_venue_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all on venue_zones" ON showcase_venue_zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on venue_settings" ON showcase_venue_settings FOR ALL USING (true) WITH CHECK (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_venue_zones_type ON showcase_venue_zones(zone_type);
