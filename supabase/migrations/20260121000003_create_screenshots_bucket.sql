-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to screenshots
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'screenshots');

-- Allow anyone to upload screenshots
CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'screenshots');
