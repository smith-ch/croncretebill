-- Migration: Create helper functions for invoice calculations
-- This script creates functions to help with invoice calculations including discounts

-- Function to calculate discount amount
CREATE OR REPLACE FUNCTION calculate_discount_amount(
    subtotal NUMERIC,
    discount_type VARCHAR(20),
    discount_value NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
    IF discount_type IS NULL OR discount_value IS NULL OR discount_value = 0 THEN
        RETURN 0;
    END IF;
    
    IF discount_type = 'percentage' THEN
        RETURN subtotal * (discount_value / 100);
    ELSIF discount_type = 'fixed' THEN
        -- Don't allow discount to exceed subtotal
        RETURN LEAST(discount_value, subtotal);
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice totals with discount
CREATE OR REPLACE FUNCTION calculate_invoice_total(
    subtotal NUMERIC,
    discount_type VARCHAR(20),
    discount_value NUMERIC,
    tax_rate NUMERIC DEFAULT 0
) RETURNS TABLE(
    discount_amount NUMERIC,
    discounted_subtotal NUMERIC,
    tax_amount NUMERIC,
    total NUMERIC
) AS $$
DECLARE
    calc_discount_amount NUMERIC;
    calc_discounted_subtotal NUMERIC;
    calc_tax_amount NUMERIC;
    calc_total NUMERIC;
BEGIN
    -- Calculate discount
    calc_discount_amount := calculate_discount_amount(subtotal, discount_type, discount_value);
    
    -- Calculate discounted subtotal
    calc_discounted_subtotal := subtotal - calc_discount_amount;
    
    -- Calculate tax on discounted amount
    calc_tax_amount := calc_discounted_subtotal * (COALESCE(tax_rate, 0) / 100);
    
    -- Calculate final total
    calc_total := calc_discounted_subtotal + calc_tax_amount;
    
    RETURN QUERY SELECT 
        calc_discount_amount,
        calc_discounted_subtotal,
        calc_tax_amount,
        calc_total;
END;
$$ LANGUAGE plpgsql;
