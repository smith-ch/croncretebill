-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Users can upload company assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-assets' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow public read access
CREATE POLICY "Public can view company assets" ON storage.objects
FOR SELECT USING (bucket_id = 'company-assets');

-- Create policy to allow users to update their own files
CREATE POLICY "Users can update company assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-assets' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow users to delete their own files
CREATE POLICY "Users can delete company assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-assets' AND
  auth.role() = 'authenticated'
);
