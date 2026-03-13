-- Fix: drivers debe tener owner_id para el trigger set_owner_id_on_insert (script 70).
-- Error: record "new" has no field "owner_id" al crear choferes.
-- Ejecutar en Supabase SQL Editor.

-- 1. Agregar columna owner_id si no existe
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Rellenar owner_id desde user_id en registros existentes
UPDATE public.drivers d
SET owner_id = COALESCE(
  (SELECT root_owner_id FROM public.user_profiles WHERE user_id = d.user_id LIMIT 1),
  d.user_id
)
WHERE owner_id IS NULL;

-- 3. Índice para RLS/consultas
CREATE INDEX IF NOT EXISTS idx_drivers_owner_id ON public.drivers(owner_id);
