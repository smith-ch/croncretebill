-- Módulo C: Enlazar conductores con perfiles de empleados
-- Permite que a los empleados se les asigne un camión/ruta

-- 1. Añadir columna employee_id a drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_drivers_employee_id ON public.drivers(employee_id);

-- 3. Comentario
COMMENT ON COLUMN public.drivers.employee_id IS 'Enlace opcional a un empleado (user profile) para acceso al sistema de rutas en la App Web del Empleado';

-- ============================================================
-- LIMPIEZA: Eliminar TODAS las políticas existentes en las tablas afectadas
-- ============================================================

-- Drivers
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'drivers' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.drivers', pol.policyname);
    END LOOP;
END $$;

-- Daily Dispatches
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'daily_dispatches' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.daily_dispatches', pol.policyname);
    END LOOP;
END $$;

-- Dispatch Items
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'dispatch_items' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.dispatch_items', pol.policyname);
    END LOOP;
END $$;

-- Dispatch Inventory Loads
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'dispatch_inventory_loads' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.dispatch_inventory_loads', pol.policyname);
    END LOOP;
END $$;

-- ============================================================
-- 4. Políticas para DRIVERS
-- ============================================================

-- Habilitar RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner ve sus drivers, empleado ve el driver donde está vinculado
CREATE POLICY "Drivers select policy" ON public.drivers 
  FOR SELECT 
  USING (
    auth.uid() = user_id  -- Owner puede ver sus propios drivers
    OR 
    auth.uid() = employee_id  -- Empleado puede ver el driver donde está vinculado
  );

-- INSERT/UPDATE/DELETE: Solo el owner
CREATE POLICY "Owners manage drivers" ON public.drivers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. Políticas para DAILY_DISPATCHES
-- ============================================================

-- Habilitar RLS
ALTER TABLE public.daily_dispatches ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner ve sus despachos, empleado ve los despachos de su driver
CREATE POLICY "Daily dispatches select policy" ON public.daily_dispatches
  FOR SELECT
  USING (
    auth.uid() = user_id  -- Owner puede ver sus despachos
    OR 
    EXISTS (
      SELECT 1 FROM public.drivers d 
      WHERE d.id = daily_dispatches.driver_id 
      AND d.employee_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Solo el owner
CREATE POLICY "Owners manage daily dispatches" ON public.daily_dispatches
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. Políticas para DISPATCH_ITEMS
-- ============================================================

-- Habilitar RLS
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;

-- SELECT: Via dispatch -> daily_dispatch -> (owner OR employee's driver)
CREATE POLICY "Dispatch items select policy" ON public.dispatch_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_dispatches dd 
      WHERE dd.id = dispatch_items.dispatch_id 
      AND (
        dd.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.drivers d 
          WHERE d.id = dd.driver_id 
          AND d.employee_id = auth.uid()
        )
      )
    )
  );

-- 7. Política para que empleados puedan ver los clientes de su owner (para ver info en las paradas)
CREATE POLICY "Clients select policy" ON public.clients
  FOR SELECT
  USING (
    auth.uid() = user_id  -- Owner puede ver sus clientes
    OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.parent_user_id = clients.user_id
      AND up.is_active = true
    )
  );

-- ============================================================
-- 8. Políticas para DISPATCH_INVENTORY_LOADS
-- ============================================================

-- Habilitar RLS
ALTER TABLE public.dispatch_inventory_loads ENABLE ROW LEVEL SECURITY;

-- SELECT: Via dispatch -> (owner OR employee's driver)
CREATE POLICY "Dispatch inventory loads select policy" ON public.dispatch_inventory_loads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_dispatches dd 
      WHERE dd.id = dispatch_inventory_loads.dispatch_id 
      AND (
        dd.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.drivers d 
          WHERE d.id = dd.driver_id 
          AND d.employee_id = auth.uid()
        )
      )
    )
  );

-- INSERT/UPDATE/DELETE: Solo el owner (via dispatch)
CREATE POLICY "Owners manage dispatch inventory loads" ON public.dispatch_inventory_loads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_dispatches dd 
      WHERE dd.id = dispatch_inventory_loads.dispatch_id 
      AND dd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_dispatches dd 
      WHERE dd.id = dispatch_inventory_loads.dispatch_id 
      AND dd.user_id = auth.uid()
    )
  );

-- ============================================================
-- 9. Políticas adicionales para productos
-- ============================================================
CREATE POLICY "Products select policy" ON public.products
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.parent_user_id = products.user_id
      AND up.is_active = true
    )
  );

-- ============================================================
-- 10. Políticas para THERMAL_RECEIPTS
-- ============================================================

-- SELECT: Owner o empleado del owner
CREATE POLICY "Thermal receipts select policy" ON public.thermal_receipts
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.parent_user_id = thermal_receipts.user_id
      AND up.is_active = true
    )
  );

-- INSERT: Owner o empleado del owner
CREATE POLICY "Thermal receipts insert policy" ON public.thermal_receipts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.parent_user_id = thermal_receipts.user_id
      AND up.is_active = true
    )
  );

-- ============================================================
-- 11. UPDATE policy para DISPATCH_ITEMS (marcar como visitado)
-- ============================================================
CREATE POLICY "Dispatch items update policy" ON public.dispatch_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_dispatches dd 
      WHERE dd.id = dispatch_items.dispatch_id 
      AND (
        dd.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.drivers d 
          WHERE d.id = dd.driver_id 
          AND d.employee_id = auth.uid()
        )
      )
    )
  );

-- INSERT para dispatch_items: Solo owner
CREATE POLICY "Dispatch items insert policy" ON public.dispatch_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_dispatches dd 
      WHERE dd.id = dispatch_items.dispatch_id 
      AND dd.user_id = auth.uid()
    )
  );

-- DELETE para dispatch_items: Solo owner
CREATE POLICY "Dispatch items delete policy" ON public.dispatch_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_dispatches dd 
      WHERE dd.id = dispatch_items.dispatch_id 
      AND dd.user_id = auth.uid()
    )
  );

-- ============================================================
-- 12. Políticas para INVOICES
-- ============================================================
CREATE POLICY "Invoices insert policy" ON public.invoices
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.parent_user_id = invoices.user_id
      AND up.is_active = true
    )
  );

-- ============================================================
-- 13. Políticas para THERMAL_RECEIPT_ITEMS
-- ============================================================
CREATE POLICY "Thermal receipt items insert policy" ON public.thermal_receipt_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thermal_receipts tr
      WHERE tr.id = thermal_receipt_items.thermal_receipt_id
      AND (
        tr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.user_id = auth.uid() 
          AND up.parent_user_id = tr.user_id
          AND up.is_active = true
        )
      )
    )
  );

-- ============================================================
-- 14. Políticas para RETURNED_ITEMS
-- ============================================================
CREATE POLICY "Returned items insert policy" ON public.returned_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thermal_receipts tr
      WHERE tr.id = returned_items.receipt_id
      AND (
        tr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.user_id = auth.uid() 
          AND up.parent_user_id = tr.user_id
          AND up.is_active = true
        )
      )
    )
  );

-- ============================================================
-- 15. Habilitar realtime en las tablas necesarias
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'dispatch_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_items;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'daily_dispatches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE daily_dispatches;
  END IF;
END $$;