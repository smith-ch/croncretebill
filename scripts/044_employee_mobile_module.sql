-- Módulo C: Acceso Operativo en Ruta (App Web - Vista de Empleado)
-- Script para agregar soporte a los recibos térmicos en ruta, retornables y crédito
-- NOTA: Ejecutar DESPUÉS de 043_dispatch_loading_module.sql

-- 1. Extender thermal_receipts con campos para operaciones en ruta
ALTER TABLE public.thermal_receipts ADD COLUMN IF NOT EXISTS dispatch_id UUID REFERENCES public.daily_dispatches(id) ON DELETE SET NULL;

-- 2. Asegurarse de que el payment_method acepte 'credit' u otros si no los tiene (como es varchar, podemos asegurar insertar los valores correctos desde el frontend, pero documentamos su uso aquí: cash, card, transfer, credit)

-- 3. Crear tabla para registro de retornables en ventas rápidas
CREATE TABLE IF NOT EXISTS public.returned_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_id UUID REFERENCES public.thermal_receipts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    condition TEXT DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'needs_cleaning')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para la tabla retornables
CREATE INDEX IF NOT EXISTS idx_returned_items_receipt_id ON public.returned_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_returned_items_product_id ON public.returned_items(product_id);

-- RLS para retornables
ALTER TABLE public.returned_items ENABLE ROW LEVEL SECURITY;

-- Políticas para la nueva tabla (basado en el receipt que le pertenece al usuario)
CREATE POLICY "Users can view their returned items" ON public.returned_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.thermal_receipts 
        WHERE id = returned_items.receipt_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert returned items" ON public.returned_items
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.thermal_receipts 
        WHERE id = returned_items.receipt_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their returned items" ON public.returned_items
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.thermal_receipts 
        WHERE id = returned_items.receipt_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their returned items" ON public.returned_items
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.thermal_receipts 
        WHERE id = returned_items.receipt_id 
        AND user_id = auth.uid()
    )
);

-- Comentarios
COMMENT ON TABLE public.returned_items IS 'Registro de botellones o envases retornados por el cliente en ruta';
