-- Migration: Add discount fields to invoices table
-- This script adds support for discount functionality in invoices

-- Add discount fields to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Add comments to document the new fields
COMMENT ON COLUMN invoices.discount_type IS 'Type of discount applied: percentage or fixed amount';
COMMENT ON COLUMN invoices.discount_value IS 'The discount value (percentage or fixed amount)';
COMMENT ON COLUMN invoices.discount_amount IS 'The calculated discount amount in currency';

-- Update existing invoices to have default discount values
UPDATE invoices 
SET discount_type = NULL, 
    discount_value = 0, 
    discount_amount = 0 
WHERE discount_type IS NULL;
