-- Módulo A: Gestión de Rutas y Programación
-- Script de migración para PostgreSQL (Supabase)

-- 1. Tabla de Rutas
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Asignación Cliente-Ruta
CREATE TABLE IF NOT EXISTS public.client_route_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  frequency TEXT NOT NULL DEFAULT 'semanal' CHECK (frequency IN ('semanal','quincenal','mensual')),
  visit_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Un cliente no puede estar asignado a la misma ruta el mismo día dos veces
  UNIQUE(client_id, route_id, day_of_week)
);

-- 3. Tabla de Despachos del Día
CREATE TABLE IF NOT EXISTS public.daily_dispatches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_progreso','completada')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(route_id, dispatch_date)
);

-- 4. Tabla de Items de Despacho (registro de cada cliente visitado en un despacho)
CREATE TABLE IF NOT EXISTS public.dispatch_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id UUID NOT NULL REFERENCES public.daily_dispatches(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  visit_order INTEGER DEFAULT 0,
  is_visited BOOLEAN DEFAULT false,
  visited_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON public.routes(user_id);
CREATE INDEX IF NOT EXISTS idx_client_route_assignments_route ON public.client_route_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_client_route_assignments_client ON public.client_route_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_route_assignments_day ON public.client_route_assignments(day_of_week);
CREATE INDEX IF NOT EXISTS idx_daily_dispatches_date ON public.daily_dispatches(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_daily_dispatches_route ON public.daily_dispatches(route_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch ON public.dispatch_items(dispatch_id);

-- RLS Policies
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_route_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;

-- Política: cada usuario solo ve sus propias rutas
CREATE POLICY "Users can manage their own routes" ON public.routes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own assignments" ON public.client_route_assignments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own dispatches" ON public.daily_dispatches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage dispatch items" ON public.dispatch_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.daily_dispatches d WHERE d.id = dispatch_id AND d.user_id = auth.uid())
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION update_routes_updated_at();
CREATE TRIGGER client_route_assignments_updated_at BEFORE UPDATE ON public.client_route_assignments FOR EACH ROW EXECUTE FUNCTION update_routes_updated_at();
CREATE TRIGGER daily_dispatches_updated_at BEFORE UPDATE ON public.daily_dispatches FOR EACH ROW EXECUTE FUNCTION update_routes_updated_at();
