-- Script para agregar owner_id a las tablas principales
-- y actualizar políticas RLS para que empleados vean datos del owner

-- 1. Agregar columna owner_id a las tablas principales
-- (solo si no existe, para evitar errores al re-ejecutar)

-- Tabla clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla delivery_notes
ALTER TABLE public.delivery_notes
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla services (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
    ALTER TABLE public.services ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tabla fixed_expenses (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_expenses') THEN
    ALTER TABLE public.fixed_expenses ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tabla agenda_events (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agenda_events') THEN
    ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tabla thermal_receipts (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thermal_receipts') THEN
    ALTER TABLE public.thermal_receipts ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Poblar owner_id para registros existentes
-- Si user_id es un owner (sin parent), owner_id = user_id
-- Si user_id es empleado, owner_id = parent_user_id

UPDATE public.clients c
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = c.user_id),
  c.user_id
)
WHERE owner_id IS NULL;

UPDATE public.projects p
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = p.user_id),
  p.user_id
)
WHERE owner_id IS NULL;

UPDATE public.products pr
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = pr.user_id),
  pr.user_id
)
WHERE owner_id IS NULL;

UPDATE public.invoices i
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = i.user_id),
  i.user_id
)
WHERE owner_id IS NULL;

UPDATE public.drivers d
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = d.user_id),
  d.user_id
)
WHERE owner_id IS NULL;

UPDATE public.vehicles v
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = v.user_id),
  v.user_id
)
WHERE owner_id IS NULL;

UPDATE public.delivery_notes dn
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = dn.user_id),
  dn.user_id
)
WHERE owner_id IS NULL;

-- 3. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON public.products(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_drivers_owner_id ON public.drivers(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON public.vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_owner_id ON public.delivery_notes(owner_id);

-- 4. Actualizar políticas RLS para usar owner_id en vez de user_id
-- Esto permite que empleados vean los datos del owner

-- Eliminar políticas antiguas basadas en user_id
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- Crear políticas nuevas basadas en owner_id
CREATE POLICY "Users can view company clients" ON public.clients
  FOR SELECT USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can insert company clients" ON public.clients
  FOR INSERT WITH CHECK (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can update company clients" ON public.clients
  FOR UPDATE USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can delete company clients" ON public.clients
  FOR DELETE USING (owner_id = public.current_root_owner_id());

-- Repetir para projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

CREATE POLICY "Users can view company projects" ON public.projects
  FOR SELECT USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can insert company projects" ON public.projects
  FOR INSERT WITH CHECK (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can update company projects" ON public.projects
  FOR UPDATE USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can delete company projects" ON public.projects
  FOR DELETE USING (owner_id = public.current_root_owner_id());

-- Repetir para products
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

CREATE POLICY "Users can view company products" ON public.products
  FOR SELECT USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can insert company products" ON public.products
  FOR INSERT WITH CHECK (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can update company products" ON public.products
  FOR UPDATE USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can delete company products" ON public.products
  FOR DELETE USING (owner_id = public.current_root_owner_id());

-- Repetir para invoices
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;

CREATE POLICY "Users can view company invoices" ON public.invoices
  FOR SELECT USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can insert company invoices" ON public.invoices
  FOR INSERT WITH CHECK (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can update company invoices" ON public.invoices
  FOR UPDATE USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can delete company invoices" ON public.invoices
  FOR DELETE USING (owner_id = public.current_root_owner_id());

-- Repetir para drivers
DROP POLICY IF EXISTS "Users can view their own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can insert their own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can update their own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Users can delete their own drivers" ON public.drivers;

CREATE POLICY "Users can view company drivers" ON public.drivers
  FOR SELECT USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can insert company drivers" ON public.drivers
  FOR INSERT WITH CHECK (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can update company drivers" ON public.drivers
  FOR UPDATE USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can delete company drivers" ON public.drivers
  FOR DELETE USING (owner_id = public.current_root_owner_id());

-- Repetir para vehicles
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;

CREATE POLICY "Users can view company vehicles" ON public.vehicles
  FOR SELECT USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can insert company vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can update company vehicles" ON public.vehicles
  FOR UPDATE USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can delete company vehicles" ON public.vehicles
  FOR DELETE USING (owner_id = public.current_root_owner_id());

-- Repetir para delivery_notes
DROP POLICY IF EXISTS "Users can view their own delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Users can insert their own delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Users can update their own delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Users can delete their own delivery notes" ON public.delivery_notes;

CREATE POLICY "Users can view company delivery notes" ON public.delivery_notes
  FOR SELECT USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can insert company delivery notes" ON public.delivery_notes
  FOR INSERT WITH CHECK (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can update company delivery notes" ON public.delivery_notes
  FOR UPDATE USING (owner_id = public.current_root_owner_id());

CREATE POLICY "Users can delete company delivery notes" ON public.delivery_notes
  FOR DELETE USING (owner_id = public.current_root_owner_id());

-- 5. Comentarios para documentación
COMMENT ON COLUMN public.clients.owner_id IS 'ID del owner (root_owner_id) que posee este registro. Permite que empleados del mismo owner vean estos datos.';
COMMENT ON COLUMN public.projects.owner_id IS 'ID del owner (root_owner_id) que posee este registro. Permite que empleados del mismo owner vean estos datos.';
COMMENT ON COLUMN public.products.owner_id IS 'ID del owner (root_owner_id) que posee este registro. Permite que empleados del mismo owner vean estos datos.';
COMMENT ON COLUMN public.invoices.owner_id IS 'ID del owner (root_owner_id) que posee este registro. Permite que empleados del mismo owner vean estos datos.';
COMMENT ON COLUMN public.drivers.owner_id IS 'ID del owner (root_owner_id) que posee este registro. Permite que empleados del mismo owner vean estos datos.';
COMMENT ON COLUMN public.vehicles.owner_id IS 'ID del owner (root_owner_id) que posee este registro. Permite que empleados del mismo owner vean estos datos.';
COMMENT ON COLUMN public.delivery_notes.owner_id IS 'ID del owner (root_owner_id) que posee este registro. Permite que empleados del mismo owner vean estos datos.';
