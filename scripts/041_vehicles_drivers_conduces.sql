-- Módulo A (Extensión): Vehículos, Choferes y Conduces
-- Script de migración para PostgreSQL (Supabase)
-- NOTA: Ejecutar DESPUÉS de 040_routes_module.sql

-- 1. Tabla de Choferes
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cedula TEXT,
  phone TEXT,
  license_number TEXT,
  license_expiry DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Vehículos
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  vehicle_type TEXT DEFAULT 'camion' CHECK (vehicle_type IN ('camion','camioneta','moto','furgon','otro')),
  capacity TEXT,
  is_active BOOLEAN DEFAULT true,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Añadir driver_id y vehicle_id a daily_dispatches
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE public.daily_dispatches ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL;

-- 4. Tabla de Conduces (Notas de Entrega)
CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispatch_id UUID REFERENCES public.daily_dispatches(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  note_number TEXT NOT NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_transito','entregado','cancelado')),
  delivery_address TEXT,
  notes TEXT,
  client_signature TEXT,
  driver_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Items del conduce
CREATE TABLE IF NOT EXISTS public.delivery_note_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_note_id UUID NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'und',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_user_id ON public.fleet_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_user_id ON public.delivery_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_dispatch ON public.delivery_notes(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_driver ON public.delivery_notes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_date ON public.delivery_notes(delivery_date);
CREATE INDEX IF NOT EXISTS idx_daily_dispatches_driver ON public.daily_dispatches(driver_id);
CREATE INDEX IF NOT EXISTS idx_daily_dispatches_vehicle ON public.daily_dispatches(vehicle_id);

-- RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drivers" ON public.drivers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own vehicles" ON public.fleet_vehicles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own delivery notes" ON public.delivery_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage delivery note items" ON public.delivery_note_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.delivery_notes dn WHERE dn.id = delivery_note_id AND dn.user_id = auth.uid())
);

-- Triggers updated_at
CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION update_routes_updated_at();
CREATE TRIGGER fleet_vehicles_updated_at BEFORE UPDATE ON public.fleet_vehicles FOR EACH ROW EXECUTE FUNCTION update_routes_updated_at();
CREATE TRIGGER delivery_notes_updated_at BEFORE UPDATE ON public.delivery_notes FOR EACH ROW EXECUTE FUNCTION update_routes_updated_at();
