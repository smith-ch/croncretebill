-- Database cleanup script to remove unused tables and improve performance
-- Remove unused tables to improve database performance
-- Run this script carefully after backing up your data

-- Drop unused tables that are not being actively used
BEGIN;

-- Remove FAQ table if it's just static content (can be moved to code)
DROP TABLE IF EXISTS faqs CASCADE;

-- Remove monthly_stats table (can be calculated on-demand)
DROP TABLE IF EXISTS monthly_stats CASCADE;

-- Remove driver_deliveries table (redundant with delivery_notes)
DROP TABLE IF EXISTS driver_deliveries CASCADE;

-- Remove sequence tables if using different numbering system
DROP TABLE IF EXISTS delivery_note_sequences CASCADE;
DROP TABLE IF EXISTS invoice_sequences CASCADE;

-- Remove budget-related tables if budgets feature is not being used
-- Uncomment these lines only if you're sure budgets are not needed
-- DROP TABLE IF EXISTS budget_items CASCADE;
-- DROP TABLE IF EXISTS budgets CASCADE;

-- Add indexes for better performance on frequently queried tables
CREATE INDEX IF NOT EXISTS idx_invoices_user_id_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_user_id_date ON expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id_date ON calendar_events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_products_user_id_active ON products(user_id) WHERE stock_quantity > 0;
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);

-- Clean up any orphaned records
DELETE FROM invoice_items WHERE invoice_id NOT IN (SELECT id FROM invoices);
DELETE FROM delivery_items WHERE delivery_note_id NOT IN (SELECT id FROM delivery_notes);

-- Update table statistics for better query planning
ANALYZE invoices;
ANALYZE expenses;
ANALYZE calendar_events;
ANALYZE products;
ANALYZE services;

COMMIT;
