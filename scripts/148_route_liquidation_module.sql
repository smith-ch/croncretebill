-- Módulo D: Liquidación de Ruta (Cierre del Camión)
-- Script de migración para PostgreSQL (Supabase)

-- 1. Extender daily_dispatches con campos de liquidación
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS total_cash_expected NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS total_cash_received NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS liquidation_notes TEXT;
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Recrear el constraint de dispatch_status para incluir en_liquidacion y liquidado (y cerrado si es necesario)
DO $$
BEGIN
  -- Intentar eliminar el constraint anterior si existe
  BEGIN
    ALTER TABLE public.daily_dispatches DROP CONSTRAINT IF EXISTS daily_dispatches_dispatch_status_check;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Añadir el nuevo constraint
  ALTER TABLE public.daily_dispatches
    ADD CONSTRAINT daily_dispatches_dispatch_status_check
    CHECK (dispatch_status IN ('preparando', 'despachado', 'en_ruta', 'en_liquidacion', 'liquidado', 'cerrado'));
END $$;

-- 2. Tabla de Liquidación / Devolución de Inventario (dispatch_liquidations)
CREATE TABLE IF NOT EXISTS public.dispatch_liquidations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id UUID NOT NULL REFERENCES public.daily_dispatches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity_full_returned NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity_empty_returned NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_liquidations_dispatch ON public.dispatch_liquidations(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_liquidations_product ON public.dispatch_liquidations(product_id);

ALTER TABLE public.dispatch_liquidations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dispatch liquidations" ON public.dispatch_liquidations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.daily_dispatches d WHERE d.id = dispatch_id AND d.user_id = auth.uid())
);

-- 3. Tabla de Penalizaciones al Empleado (employee_penalties)
CREATE TABLE IF NOT EXISTS public.employee_penalties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Dueño del sistema
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE, -- Chofer penalizado
  dispatch_id UUID REFERENCES public.daily_dispatches(id) ON DELETE CASCADE, -- Despacho donde ocurrió
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL CHECK (reason IN ('faltante_efectivo', 'rotura_producto', 'perdida_envase', 'otro')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'descontado', 'pagado', 'cancelado')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_penalties_user ON public.employee_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_penalties_driver ON public.employee_penalties(driver_id);
CREATE INDEX IF NOT EXISTS idx_employee_penalties_dispatch ON public.employee_penalties(dispatch_id);

ALTER TABLE public.employee_penalties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own employee penalties" ON public.employee_penalties FOR ALL USING (auth.uid() = user_id);

-- Trigger updated_at for employee_penalties
CREATE TRIGGER employee_penalties_updated_at BEFORE UPDATE ON public.employee_penalties FOR EACH ROW EXECUTE FUNCTION update_routes_updated_at();
