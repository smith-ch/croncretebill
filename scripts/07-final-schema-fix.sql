-- Drop existing tables and recreate with correct schema
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS delivery_items CASCADE;
DROP TABLE IF EXISTS driver_deliveries CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS delivery_notes CASCADE;

-- Recreate invoices table with correct columns
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 18,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviada', 'pagada', 'cancelada')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate delivery_notes table with correct columns
CREATE TABLE delivery_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    delivery_number TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    departure_time TIME,
    arrival_time TIME,
    delivery_address TEXT,
    pump_info TEXT,
    plant_info TEXT,
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_transito', 'entregado', 'cancelado')),
    dispatcher_signature TEXT,
    client_signature TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate invoice_items table
CREATE TABLE invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    unit TEXT DEFAULT 'm³',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate delivery_items table
CREATE TABLE delivery_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT DEFAULT 'm³',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate driver_deliveries table
CREATE TABLE driver_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    delivery_date DATE NOT NULL,
    departure_time TIME,
    arrival_time TIME,
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_transito', 'entregado', 'cancelado')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_deliveries ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

-- Policies for delivery_notes
CREATE POLICY "Users can view own delivery_notes" ON delivery_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own delivery_notes" ON delivery_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own delivery_notes" ON delivery_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own delivery_notes" ON delivery_notes FOR DELETE USING (auth.uid() = user_id);

-- Policies for invoice_items
CREATE POLICY "Users can view own invoice_items" ON invoice_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can insert own invoice_items" ON invoice_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can update own invoice_items" ON invoice_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can delete own invoice_items" ON invoice_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);

-- Policies for delivery_items
CREATE POLICY "Users can view own delivery_items" ON delivery_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_items.delivery_note_id AND delivery_notes.user_id = auth.uid())
);
CREATE POLICY "Users can insert own delivery_items" ON delivery_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_items.delivery_note_id AND delivery_notes.user_id = auth.uid())
);
CREATE POLICY "Users can update own delivery_items" ON delivery_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_items.delivery_note_id AND delivery_notes.user_id = auth.uid())
);
CREATE POLICY "Users can delete own delivery_items" ON delivery_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_items.delivery_note_id AND delivery_notes.user_id = auth.uid())
);

-- Policies for driver_deliveries
CREATE POLICY "Users can view own driver_deliveries" ON driver_deliveries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own driver_deliveries" ON driver_deliveries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own driver_deliveries" ON driver_deliveries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own driver_deliveries" ON driver_deliveries FOR DELETE USING (auth.uid() = user_id);

-- Create or replace functions for auto-numbering
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    current_year INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'FAC-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM invoices
    WHERE invoice_number LIKE 'FAC-' || current_year || '-%'
    AND user_id = auth.uid();
    
    RETURN 'FAC-' || current_year || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_next_delivery_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    current_year INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(delivery_number FROM 'CON-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM delivery_notes
    WHERE delivery_number LIKE 'CON-' || current_year || '-%'
    AND user_id = auth.uid();
    
    RETURN 'CON-' || current_year || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for driver deliveries
CREATE OR REPLACE FUNCTION create_driver_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.driver_id IS NOT NULL THEN
        INSERT INTO driver_deliveries (
            user_id,
            driver_id,
            delivery_note_id,
            vehicle_id,
            delivery_date,
            departure_time,
            status
        ) VALUES (
            NEW.user_id,
            NEW.driver_id,
            NEW.id,
            NEW.vehicle_id,
            NEW.delivery_date,
            NEW.departure_time,
            NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_driver_delivery ON delivery_notes;
CREATE TRIGGER trigger_create_driver_delivery
    AFTER INSERT ON delivery_notes
    FOR EACH ROW
    EXECUTE FUNCTION create_driver_delivery();
