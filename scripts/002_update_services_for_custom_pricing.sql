-- Migration: Update services table to support custom pricing
-- This script ensures services can have null prices for custom pricing

-- The services.price column should already allow NULL values
-- But let's make sure and add a comment for clarity
COMMENT ON COLUMN services.price IS 'Service price - can be NULL for custom pricing services';

-- Add an index for better performance when filtering services by price
CREATE INDEX IF NOT EXISTS idx_services_price_null ON services (price) WHERE price IS NULL;
CREATE INDEX IF NOT EXISTS idx_services_price_not_null ON services (price) WHERE price IS NOT NULL;
