-- Migration: Update invoice_items to handle custom pricing services
-- This script ensures invoice items can handle services with custom pricing

-- Add a comment to clarify that unit_price in invoice_items 
-- can be different from the service price for custom pricing
COMMENT ON COLUMN invoice_items.unit_price IS 'Unit price for this invoice item - may differ from product/service base price for custom pricing';

-- Create an index for better performance when querying invoice items by service
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items (service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items (product_id) WHERE product_id IS NOT NULL;

-- Add constraint to ensure either product_id or service_id is set, but not both
ALTER TABLE invoice_items 
ADD CONSTRAINT chk_invoice_items_product_or_service 
CHECK (
    (product_id IS NOT NULL AND service_id IS NULL) OR 
    (product_id IS NULL AND service_id IS NOT NULL)
);
