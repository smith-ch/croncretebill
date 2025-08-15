-- Fix database schema to match the code
-- Add missing columns and fix naming

-- Fix invoices table - ensure all required columns exist
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- If invoice_date is null, copy from issue_date
UPDATE public.invoices 
SET invoice_date = issue_date 
WHERE invoice_date IS NULL AND issue_date IS NOT NULL;

-- If both are null, set to current date
UPDATE public.invoices 
SET invoice_date = CURRENT_DATE 
WHERE invoice_date IS NULL;

-- Add missing columns to invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 18.00,
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id),
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id);

-- Fix products table - ensure price column exists
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Update existing products to use unit_price as price if price is null
UPDATE public.products 
SET price = unit_price 
WHERE price IS NULL AND unit_price IS NOT NULL;

-- Set default price for products without price
UPDATE public.products 
SET price = 0 
WHERE price IS NULL;

-- Fix delivery_notes table - ensure all columns exist
ALTER TABLE public.delivery_notes 
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id),
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id);

-- Fix invoice_items table
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'm³',
ADD COLUMN IF NOT EXISTS total DECIMAL(10,2);

-- Calculate total for existing items
UPDATE public.invoice_items 
SET total = quantity * unit_price 
WHERE total IS NULL;

-- Fix delivery_items table
ALTER TABLE public.delivery_items 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'm³';

-- Update delivery_items unit from products if null
UPDATE public.delivery_items di
SET unit = p.unit
FROM public.products p
WHERE di.product_id = p.id AND di.unit IS NULL;

-- Recreate auto-numbering functions with better error handling
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get the highest number for current year
  SELECT COALESCE(MAX(
    CASE
      WHEN invoice_number ~ ('^FAC-' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(invoice_number FROM LENGTH('FAC-' || current_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.invoices;
  
  -- Format the number
  formatted_number := 'FAC-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_delivery_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get the highest number for current year
  SELECT COALESCE(MAX(
    CASE
      WHEN delivery_number ~ ('^CON-' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(delivery_number FROM LENGTH('CON-' || current_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.delivery_notes;
  
  -- Format the number
  formatted_number := 'CON-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Add company customization columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
