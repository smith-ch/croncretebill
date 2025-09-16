-- Inventory Management System Schema
-- Create comprehensive inventory tracking system

-- Create warehouses table for multiple storage locations
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT,
    manager_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add inventory fields to existing products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS current_stock DECIMAL(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserved_stock DECIMAL(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_stock DECIMAL(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS location VARCHAR(50),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
ADD COLUMN IF NOT EXISTS supplier_id UUID,
ADD COLUMN IF NOT EXISTS is_trackable BOOLEAN DEFAULT true;

-- Create product_warehouse_stock table for multi-warehouse support
CREATE TABLE IF NOT EXISTS public.product_warehouse_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
    current_stock DECIMAL(10,3) DEFAULT 0,
    reserved_stock DECIMAL(10,3) DEFAULT 0,
    available_stock DECIMAL(10,3) DEFAULT 0,
    location VARCHAR(50),
    last_movement_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- Create stock_movements table for tracking all inventory changes
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste', 'transferencia', 'venta', 'devolucion')),
    quantity_before DECIMAL(10,3) NOT NULL,
    quantity_change DECIMAL(10,3) NOT NULL,
    quantity_after DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    reference_type VARCHAR(20), -- 'invoice', 'purchase', 'adjustment', 'transfer', etc.
    reference_id UUID, -- ID of related document (invoice_id, purchase_id, etc.)
    notes TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add supplier reference to products
ALTER TABLE public.products 
ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE,
    status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'parcial', 'recibido', 'cancelado')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity_ordered DECIMAL(10,3) NOT NULL,
    quantity_received DECIMAL(10,3) DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_adjustments table
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
    adjustment_number VARCHAR(50) NOT NULL,
    adjustment_date DATE NOT NULL,
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aplicado', 'cancelado')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_adjustment_items table
CREATE TABLE IF NOT EXISTS public.inventory_adjustment_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    adjustment_id UUID REFERENCES public.inventory_adjustments(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    system_quantity DECIMAL(10,3) NOT NULL,
    physical_quantity DECIMAL(10,3) NOT NULL,
    difference DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    total_cost_impact DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustment_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for warehouses
CREATE POLICY "Users can manage own warehouses" ON public.warehouses
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for product_warehouse_stock
CREATE POLICY "Users can view own product warehouse stock" ON public.product_warehouse_stock
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.id = product_warehouse_stock.product_id 
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own product warehouse stock" ON public.product_warehouse_stock
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.id = product_warehouse_stock.product_id 
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own product warehouse stock" ON public.product_warehouse_stock
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.id = product_warehouse_stock.product_id 
      AND p.user_id = auth.uid()
    )
  );

-- Create RLS policies for stock_movements
CREATE POLICY "Users can manage own stock movements" ON public.stock_movements
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for suppliers
CREATE POLICY "Users can manage own suppliers" ON public.suppliers
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for purchase_orders
CREATE POLICY "Users can manage own purchase orders" ON public.purchase_orders
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for purchase_order_items
CREATE POLICY "Users can view own purchase order items" ON public.purchase_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po 
      WHERE po.id = purchase_order_items.purchase_order_id 
      AND po.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own purchase order items" ON public.purchase_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po 
      WHERE po.id = purchase_order_items.purchase_order_id 
      AND po.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own purchase order items" ON public.purchase_order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po 
      WHERE po.id = purchase_order_items.purchase_order_id 
      AND po.user_id = auth.uid()
    )
  );

-- Create RLS policies for inventory_adjustments
CREATE POLICY "Users can manage own inventory adjustments" ON public.inventory_adjustments
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for inventory_adjustment_items
CREATE POLICY "Users can view own adjustment items" ON public.inventory_adjustment_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inventory_adjustments ia 
      WHERE ia.id = inventory_adjustment_items.adjustment_id 
      AND ia.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own adjustment items" ON public.inventory_adjustment_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_adjustments ia 
      WHERE ia.id = inventory_adjustment_items.adjustment_id 
      AND ia.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own adjustment items" ON public.inventory_adjustment_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.inventory_adjustments ia 
      WHERE ia.id = inventory_adjustment_items.adjustment_id 
      AND ia.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id ON public.stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON public.stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON public.stock_movements(user_id);

CREATE INDEX IF NOT EXISTS idx_product_warehouse_stock_product_id ON public.product_warehouse_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_warehouse_stock_warehouse_id ON public.product_warehouse_stock(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_products_current_stock ON public.products(current_stock);
CREATE INDEX IF NOT EXISTS idx_products_reorder_point ON public.products(reorder_point);

-- Create functions for automated stock calculations
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update available stock calculation
  UPDATE public.products 
  SET available_stock = current_stock - reserved_stock,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_product_stock ON public.product_warehouse_stock;
CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT OR UPDATE OF current_stock, reserved_stock
  ON public.product_warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Function to get next purchase order number
CREATE OR REPLACE FUNCTION get_next_purchase_order_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.purchase_orders
  WHERE order_number ~ '^PO-[0-9]+$';
  
  formatted_number := 'PO-' || LPAD(next_number::TEXT, 6, '0');
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get next adjustment number
CREATE OR REPLACE FUNCTION get_next_adjustment_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(adjustment_number FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.inventory_adjustments
  WHERE adjustment_number ~ '^ADJ-[0-9]+$';
  
  formatted_number := 'ADJ-' || LPAD(next_number::TEXT, 6, '0');
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Insert default warehouse for existing users
INSERT INTO public.warehouses (user_id, name, description, is_active)
SELECT DISTINCT p.id, 'Almacén Principal', 'Almacén principal del sistema', true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.warehouses w WHERE w.user_id = p.id
)
ON CONFLICT DO NOTHING;

-- Initialize stock for existing products
INSERT INTO public.product_warehouse_stock (product_id, warehouse_id, current_stock, available_stock)
SELECT 
  p.id,
  w.id,
  COALESCE(p.stock_quantity, 0),
  COALESCE(p.stock_quantity, 0)
FROM public.products p
CROSS JOIN public.warehouses w
WHERE w.user_id = p.user_id
AND NOT EXISTS (
  SELECT 1 FROM public.product_warehouse_stock pws 
  WHERE pws.product_id = p.id AND pws.warehouse_id = w.id
)
ON CONFLICT DO NOTHING;

-- Update products current_stock from existing stock_quantity
UPDATE public.products 
SET current_stock = COALESCE(stock_quantity, 0),
    available_stock = COALESCE(stock_quantity, 0)
WHERE current_stock = 0 AND stock_quantity IS NOT NULL;