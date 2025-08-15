-- Allow NULL prices in services table for custom pricing services
-- Remove NOT NULL constraint from price column in services table
ALTER TABLE services ALTER COLUMN price DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN services.price IS 'Price can be NULL for custom pricing services where price is defined per invoice';

-- Update any existing services with 0 price to NULL if they should be custom pricing
-- (This is optional - only run if you want to convert existing zero-price services)
-- UPDATE services SET price = NULL WHERE price = 0;
