-- Create company_settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  company_logo TEXT,
  tax_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can delete their own company settings" ON public.company_settings;

-- Create policies
CREATE POLICY "Users can view their own company settings" ON public.company_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company settings" ON public.company_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings" ON public.company_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company settings" ON public.company_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company assets" ON storage.objects;

-- Create storage policies
CREATE POLICY "Users can upload company assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "Users can update company assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete company assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
