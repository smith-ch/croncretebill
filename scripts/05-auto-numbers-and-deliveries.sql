-- Create sequence tables for auto-incrementing numbers
CREATE TABLE IF NOT EXISTS invoice_sequences (
  year INTEGER PRIMARY KEY,
  last_number INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS delivery_note_sequences (
  year INTEGER PRIMARY KEY,
  last_number INTEGER DEFAULT 0
);

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get or create sequence for current year
  INSERT INTO invoice_sequences (year, last_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;
  
  -- Increment and get next number
  UPDATE invoice_sequences 
  SET last_number = last_number + 1
  WHERE year = current_year
  RETURNING last_number INTO next_number;
  
  -- Format as FAC-YYYY-NNNN
  formatted_number := 'FAC-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get next delivery note number
CREATE OR REPLACE FUNCTION get_next_delivery_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get or create sequence for current year
  INSERT INTO delivery_note_sequences (year, last_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;
  
  -- Increment and get next number
  UPDATE delivery_note_sequences 
  SET last_number = last_number + 1
  WHERE year = current_year
  RETURNING last_number INTO next_number;
  
  -- Format as CON-YYYY-NNNN
  formatted_number := 'CON-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Create driver deliveries table
CREATE TABLE IF NOT EXISTS driver_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completada', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE driver_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_deliveries
CREATE POLICY "Users can view own driver deliveries" ON driver_deliveries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own driver deliveries" ON driver_deliveries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own driver deliveries" ON driver_deliveries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own driver deliveries" ON driver_deliveries
  FOR DELETE USING (auth.uid() = user_id);

-- Function to create driver delivery when invoice/delivery note is created with driver
CREATE OR REPLACE FUNCTION create_driver_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if driver_id is provided
  IF NEW.driver_id IS NOT NULL THEN
    INSERT INTO driver_deliveries (user_id, driver_id, invoice_id, delivery_note_id, delivery_date, status)
    VALUES (
      NEW.user_id,
      NEW.driver_id,
      CASE WHEN TG_TABLE_NAME = 'invoices' THEN NEW.id ELSE NULL END,
      CASE WHEN TG_TABLE_NAME = 'delivery_notes' THEN NEW.id ELSE NULL END,
      COALESCE(NEW.invoice_date, NEW.delivery_date),
      'pendiente'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS create_driver_delivery_on_invoice ON invoices;
CREATE TRIGGER create_driver_delivery_on_invoice
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION create_driver_delivery();

DROP TRIGGER IF EXISTS create_driver_delivery_on_delivery_note ON delivery_notes;
CREATE TRIGGER create_driver_delivery_on_delivery_note
  AFTER INSERT ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION create_driver_delivery();
