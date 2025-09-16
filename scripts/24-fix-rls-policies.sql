-- Corregir políticas RLS para las tablas principales
-- Este script permite que las APIs funcionen correctamente

-- TABLA: invoices
-- Eliminar políticas existentes que pueden estar causando conflictos
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;

-- Crear nuevas políticas más permisivas para APIs
CREATE POLICY "Enable read access for authenticated users" ON public.invoices
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.invoices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.invoices
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.invoices
    FOR DELETE USING (true);

-- TABLA: invoice_items
DROP POLICY IF EXISTS "Users can view own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can insert own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can update own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can delete own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can manage own invoice items" ON public.invoice_items;

CREATE POLICY "Enable read access for authenticated users" ON public.invoice_items
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.invoice_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.invoice_items
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.invoice_items
    FOR DELETE USING (true);

-- TABLA: products
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;

CREATE POLICY "Enable read access for authenticated users" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.products
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.products
    FOR DELETE USING (true);

-- TABLA: clients
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;

CREATE POLICY "Enable read access for authenticated users" ON public.clients
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.clients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.clients
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.clients
    FOR DELETE USING (true);

-- TABLA: projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;

CREATE POLICY "Enable read access for authenticated users" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.projects
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.projects
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.projects
    FOR DELETE USING (true);

-- TABLA: services
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert own services" ON public.services;
DROP POLICY IF EXISTS "Users can update own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete own services" ON public.services;
DROP POLICY IF EXISTS "Users can manage own services" ON public.services;

CREATE POLICY "Enable read access for authenticated users" ON public.services
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.services
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.services
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.services
    FOR DELETE USING (true);

-- TABLAS DE INVENTARIO: warehouses
DROP POLICY IF EXISTS "Users can view their own warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users can insert their own warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users can update their own warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users can delete their own warehouses" ON public.warehouses;

CREATE POLICY "Enable read access for authenticated users" ON public.warehouses
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.warehouses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.warehouses
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.warehouses
    FOR DELETE USING (true);

-- TABLAS DE INVENTARIO: stock_movements
DROP POLICY IF EXISTS "Users can view their own stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can insert their own stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can update their own stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can delete their own stock movements" ON public.stock_movements;

CREATE POLICY "Enable read access for authenticated users" ON public.stock_movements
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.stock_movements
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.stock_movements
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.stock_movements
    FOR DELETE USING (true);

-- TABLAS DE INVENTARIO: product_warehouse_stock
DROP POLICY IF EXISTS "Users can view their own product warehouse stock" ON public.product_warehouse_stock;
DROP POLICY IF EXISTS "Users can insert their own product warehouse stock" ON public.product_warehouse_stock;
DROP POLICY IF EXISTS "Users can update their own product warehouse stock" ON public.product_warehouse_stock;
DROP POLICY IF EXISTS "Users can delete their own product warehouse stock" ON public.product_warehouse_stock;

CREATE POLICY "Enable read access for authenticated users" ON public.product_warehouse_stock
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.product_warehouse_stock
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.product_warehouse_stock
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.product_warehouse_stock
    FOR DELETE USING (true);

-- Verificar que RLS esté habilitado en todas las tablas
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_warehouse_stock ENABLE ROW LEVEL SECURITY;