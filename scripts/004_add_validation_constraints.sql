-- Migration: Add validation constraints for data integrity
-- This script adds constraints to ensure data consistency

-- Add constraints for discount validation
ALTER TABLE invoices 
ADD CONSTRAINT chk_discount_value_positive 
CHECK (discount_value >= 0);

ALTER TABLE invoices 
ADD CONSTRAINT chk_discount_amount_positive 
CHECK (discount_amount >= 0);

-- Add constraint to ensure discount doesn't exceed subtotal for fixed discounts
ALTER TABLE invoices 
ADD CONSTRAINT chk_fixed_discount_not_exceed_subtotal 
CHECK (
    discount_type != 'fixed' OR 
    discount_amount <= subtotal OR 
    discount_amount = 0
);

-- Add constraint for percentage discounts (0-100%)
ALTER TABLE invoices 
ADD CONSTRAINT chk_percentage_discount_valid 
CHECK (
    discount_type != 'percentage' OR 
    discount_value <= 100 OR 
    discount_value = 0
);

-- Ensure services with null price are handled properly
-- Add constraint to ensure unit is specified for all services
ALTER TABLE services 
ADD CONSTRAINT chk_services_unit_not_empty 
CHECK (unit IS NOT NULL AND unit != '');

-- Add constraint to ensure name is not empty
ALTER TABLE services 
ADD CONSTRAINT chk_services_name_not_empty 
CHECK (name IS NOT NULL AND name != '');
