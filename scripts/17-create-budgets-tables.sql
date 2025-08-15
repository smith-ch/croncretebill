-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    budget_number VARCHAR(50) NOT NULL,
    budget_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    status VARCHAR(20) DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviado', 'aprobado', 'rechazado', 'vencido')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    itbis_rate DECIMAL(5,2) DEFAULT 0,
    itbis_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_items table
CREATE TABLE IF NOT EXISTS budget_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_client_id ON budgets(client_id);
CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_budget_date ON budgets(budget_date);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_product_id ON budget_items(product_id);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

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
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM budgets 
            WHERE budgets.id = budget_items.budget_id 
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own budget items" ON budget_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM budgets 
            WHERE budgets.id = budget_items.budget_id 
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own budget items" ON budget_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM budgets 
            WHERE budgets.id = budget_items.budget_id 
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own budget items" ON budget_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM budgets 
            WHERE budgets.id = budget_items.budget_id 
            AND budgets.user_id = auth.uid()
        )
    );

-- Create function to update budget totals
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

-- Create triggers to automatically update budget totals
CREATE TRIGGER update_budget_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON budget_items
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_totals();

-- Create function to generate budget numbers
CREATE OR REPLACE FUNCTION generate_budget_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_suffix VARCHAR(2);
BEGIN
    -- Get the last two digits of the current year
    year_suffix := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Get the next number for this user and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(budget_number FROM '^PRES-(\d+)-' || year_suffix || '$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM budgets
    WHERE user_id = NEW.user_id
    AND budget_number ~ ('^PRES-\d+-' || year_suffix || '$');
    
    -- Generate the budget number
    NEW.budget_number := 'PRES-' || LPAD(next_number::TEXT, 4, '0') || '-' || year_suffix;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate budget numbers
CREATE TRIGGER generate_budget_number_trigger
    BEFORE INSERT ON budgets
    FOR EACH ROW
    WHEN (NEW.budget_number IS NULL OR NEW.budget_number = '')
    EXECUTE FUNCTION generate_budget_number();
