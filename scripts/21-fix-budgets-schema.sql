-- Add missing columns to budgets table
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS itbis_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS itbis_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS terms_conditions TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make budget_number nullable
ALTER TABLE budgets ALTER COLUMN budget_number DROP NOT NULL;

-- Update existing budgets to have proper ITBIS calculations
UPDATE budgets 
SET 
  itbis_rate = CASE WHEN itbis_amount > 0 THEN 18 ELSE 0 END,
  itbis_amount = CASE WHEN itbis_amount IS NULL THEN 0 ELSE itbis_amount END
WHERE itbis_rate IS NULL OR itbis_amount IS NULL;

-- Update existing budgets without budget_number
UPDATE budgets 
SET budget_number = 'PRES-' || EXTRACT(YEAR FROM created_at) || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)::text, 4, '0')
WHERE budget_number IS NULL;

-- Ensure budget_items table has all necessary columns
ALTER TABLE budget_items 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unidad';

-- Add service_id column to budget_items for service support
ALTER TABLE budget_items 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE CASCADE;

-- Update the budget totals function to handle both products and services
CREATE OR REPLACE FUNCTION update_budget_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE budgets 
  SET 
      subtotal = (
          SELECT COALESCE(SUM(total), 0) 
          FROM budget_items 
          WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id)
      ),
      updated_at = NOW()
  WHERE id = COALESCE(NEW.budget_id, OLD.budget_id);
  
  -- Update ITBIS and total
  UPDATE budgets 
  SET 
      itbis_amount = subtotal * (itbis_rate / 100),
      total = subtotal + (subtotal * (itbis_rate / 100))
  WHERE id = COALESCE(NEW.budget_id, OLD.budget_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_budget_totals_on_item_change ON budget_items;
CREATE TRIGGER update_budget_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_totals();
