-- Create expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  budget_number TEXT NOT NULL,
  budget_date DATE NOT NULL,
  valid_until DATE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviado', 'aprobado', 'rechazado', 'vencido')),
  include_itbis BOOLEAN DEFAULT false,
  ncf TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget items table
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'm³',
  itbis_rate DECIMAL(5,2) DEFAULT 0,
  itbis_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expense_categories
CREATE POLICY "Users can view their own expense categories" ON expense_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense categories" ON expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense categories" ON expense_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense categories" ON expense_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for expenses
CREATE POLICY "Users can view their own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for budgets
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for budget_items
CREATE POLICY "Users can view their own budget items" ON budget_items
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM budgets WHERE id = budget_id));

CREATE POLICY "Users can insert their own budget items" ON budget_items
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM budgets WHERE id = budget_id));

CREATE POLICY "Users can update their own budget items" ON budget_items
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM budgets WHERE id = budget_id));

CREATE POLICY "Users can delete their own budget items" ON budget_items
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM budgets WHERE id = budget_id));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_client_id ON budgets(client_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);

-- Create function to get next budget number
CREATE OR REPLACE FUNCTION get_next_budget_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  current_year TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(budget_number FROM 'PRES-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM budgets
  WHERE user_id = auth.uid()
  AND budget_number LIKE 'PRES-' || current_year || '-%';
  
  RETURN 'PRES-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default expense categories
INSERT INTO expense_categories (user_id, name, description, color) 
SELECT 
  auth.uid(),
  'Combustible',
  'Gastos de combustible y gasolina',
  '#EF4444'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (user_id, name, description, color) 
SELECT 
  auth.uid(),
  'Mantenimiento',
  'Gastos de mantenimiento y reparaciones',
  '#F59E0B'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (user_id, name, description, color) 
SELECT 
  auth.uid(),
  'Oficina',
  'Gastos de oficina y suministros',
  '#10B981'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (user_id, name, description, color) 
SELECT 
  auth.uid(),
  'Transporte',
  'Gastos de transporte y logística',
  '#3B82F6'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;
