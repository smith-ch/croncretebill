-- Add company_logo column to company_settings table
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS company_logo TEXT;

-- Update the table comment
COMMENT ON COLUMN company_settings.company_logo IS 'URL or path to the company logo image';
