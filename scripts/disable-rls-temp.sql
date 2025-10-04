-- Script temporal para deshabilitar RLS mientras solucionamos el problema
-- SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN

-- Deshabilitar RLS temporalmente en las tablas principales
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_warehouse_stock DISABLE ROW LEVEL SECURITY;

-- Mensaje de advertencia
DO $$
BEGIN
    RAISE NOTICE 'RLS deshabilitado temporalmente para desarrollo. Recuerda habilitarlo en producción.';
END $$;