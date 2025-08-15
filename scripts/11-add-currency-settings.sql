-- Add currency settings to company_settings table
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'DOP',
ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT 'RD$';

-- Update existing records to have default currency
UPDATE company_settings 
SET currency_code = 'DOP', currency_symbol = 'RD$' 
WHERE currency_code IS NULL OR currency_symbol IS NULL;
