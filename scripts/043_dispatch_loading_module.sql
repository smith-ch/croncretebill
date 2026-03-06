-- Módulo B: Despacho Matutino (Carga y Salida de Planta)
-- Script de migración para PostgreSQL (Supabase)
-- NOTA: Ejecutar DESPUÉS de 040 y 041

-- 1. Extender daily_dispatches con campos de despacho matutino
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS petty_cash_amount NUMERIC(10,2) DEFAULT 500.00;
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'preparando';
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS departure_time TIMESTAMPTZ;

-- Validar valores de dispatch_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'daily_dispatches_dispatch_status_check'
    AND table_name = 'daily_dispatches'
  ) THEN
    ALTER TABLE public.daily_dispatches
      ADD CONSTRAINT daily_dispatches_dispatch_status_check
      CHECK (dispatch_status IN ('preparando','despachado','en_ruta','liquidado'));
  END IF;
END $$;

-- 2. Tabla de carga de inventario por despacho
CREATE TABLE IF NOT EXISTS public.dispatch_inventory_loads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id UUID NOT NULL REFERENCES public.daily_dispatches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity_loaded NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'und',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Extender delivery_notes con tipo de conduce
ALTER TABLE public.delivery_notes ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'entrega_cliente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'delivery_notes_note_type_check'
    AND table_name = 'delivery_notes'
  ) THEN
    ALTER TABLE public.delivery_notes
      ADD CONSTRAINT delivery_notes_note_type_check
      CHECK (note_type IN ('salida_planta','entrega_cliente'));
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_dispatch_inventory_loads_dispatch ON public.dispatch_inventory_loads(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_inventory_loads_product ON public.dispatch_inventory_loads(product_id);
CREATE INDEX IF NOT EXISTS idx_daily_dispatches_dispatch_status ON public.daily_dispatches(dispatch_status);

-- RLS
ALTER TABLE public.dispatch_inventory_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage dispatch inventory loads" ON public.dispatch_inventory_loads FOR ALL USING (
  EXISTS (SELECT 1 FROM public.daily_dispatches d WHERE d.id = dispatch_id AND d.user_id = auth.uid())
);
