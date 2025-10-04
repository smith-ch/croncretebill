-- Add business information fields to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS foundation_year TEXT,
ADD COLUMN IF NOT EXISTS employee_count TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.company_settings.business_type IS 'Type of business entity (e.g., SRL, SA, etc.)';
COMMENT ON COLUMN public.company_settings.foundation_year IS 'Year the company was founded';
COMMENT ON COLUMN public.company_settings.employee_count IS 'Number of employees range (e.g., 1-10, 11-50)';
COMMENT ON COLUMN public.company_settings.industry IS 'Industry sector the company operates in';