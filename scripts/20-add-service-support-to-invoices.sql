-- Add service_id column to invoice_items table
ALTER TABLE invoice_items 
ADD COLUMN service_id UUID REFERENCES services(id);

-- Add constraint to ensure either product_id or service_id is set, but not both
ALTER TABLE invoice_items 
ADD CONSTRAINT invoice_items_product_or_service_check 
CHECK (
  (product_id IS NOT NULL AND service_id IS NULL) OR 
  (product_id IS NULL AND service_id IS NOT NULL)
);

-- Update existing invoice_items to ensure they have product_id set
UPDATE invoice_items 
SET product_id = (
  SELECT id FROM products 
  WHERE products.user_id = (
    SELECT user_id FROM invoices 
    WHERE invoices.id = invoice_items.invoice_id
  ) 
  LIMIT 1
)
WHERE product_id IS NULL AND service_id IS NULL;

-- Add service_id column to budget_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'budget_items' AND column_name = 'service_id') THEN
        ALTER TABLE budget_items 
        ADD COLUMN service_id UUID REFERENCES services(id);
    END IF;
END $$;

-- Add constraint to budget_items to ensure either product_id or service_id is set
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'budget_items_product_or_service_check') THEN
        ALTER TABLE budget_items 
        ADD CONSTRAINT budget_items_product_or_service_check 
        CHECK (
          (product_id IS NOT NULL AND service_id IS NULL) OR 
          (product_id IS NULL AND service_id IS NOT NULL)
        );
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_service_id ON budget_items(service_id);

-- Update RLS policies for invoice_items to include services
DROP POLICY IF EXISTS "Users can view their own invoice items" ON invoice_items;
CREATE POLICY "Users can view their own invoice items" ON invoice_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = invoice_items.invoice_id 
    AND invoices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own invoice items" ON invoice_items;
CREATE POLICY "Users can insert their own invoice items" ON invoice_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = invoice_items.invoice_id 
    AND invoices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own invoice items" ON invoice_items;
CREATE POLICY "Users can update their own invoice items" ON invoice_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = invoice_items.invoice_id 
    AND invoices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own invoice items" ON invoice_items;
CREATE POLICY "Users can delete their own invoice items" ON invoice_items
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = invoice_items.invoice_id 
    AND invoices.user_id = auth.uid()
  )
);

-- Update RLS policies for budget_items to include services
DROP POLICY IF EXISTS "Users can view their own budget items" ON budget_items;
CREATE POLICY "Users can view their own budget items" ON budget_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE budgets.id = budget_items.budget_id 
    AND budgets.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own budget items" ON budget_items;
CREATE POLICY "Users can insert their own budget items" ON budget_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE budgets.id = budget_items.budget_id 
    AND budgets.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own budget items" ON budget_items;
CREATE POLICY "Users can update their own budget items" ON budget_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE budgets.id = budget_items.budget_id 
    AND budgets.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own budget items" ON budget_items;
CREATE POLICY "Users can delete their own budget items" ON budget_items
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE budgets.id = budget_items.budget_id 
    AND budgets.user_id = auth.uid()
  )
);
