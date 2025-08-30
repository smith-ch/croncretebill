-- Additional performance optimizations
-- Database performance optimization script
BEGIN;

-- Add missing foreign key constraints for data integrity
ALTER TABLE invoice_items 
ADD CONSTRAINT fk_invoice_items_invoice 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE calendar_events 
ADD CONSTRAINT fk_calendar_events_user 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid ON invoices(user_id, due_date) 
WHERE status != 'pagada' AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(user_id, next_due_date) 
WHERE is_active = true;

-- Add check constraints for data validation
ALTER TABLE invoices 
ADD CONSTRAINT chk_invoices_total_positive 
CHECK (total >= 0);

ALTER TABLE expenses 
ADD CONSTRAINT chk_expenses_amount_positive 
CHECK (amount >= 0);

-- Clean up any invalid data
UPDATE invoices SET status = 'borrador' WHERE status IS NULL;
UPDATE expenses SET expense_date = created_at::date WHERE expense_date IS NULL;

COMMIT;
