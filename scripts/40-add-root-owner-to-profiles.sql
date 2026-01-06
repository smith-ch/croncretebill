-- Script para agregar root_owner_id a user_profiles
-- Esto permite identificar fácilmente a qué "empresa" (owner) pertenece cada usuario

-- 1. Agregar columna root_owner_id
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS root_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_profiles_root_owner_id 
  ON public.user_profiles(root_owner_id);

-- 3. Poblar root_owner_id para registros existentes
-- Para owners: root_owner_id = user_id
-- Para empleados: root_owner_id = parent_user_id
UPDATE public.user_profiles
SET root_owner_id = CASE
  WHEN parent_user_id IS NULL THEN user_id  -- Es owner
  ELSE parent_user_id  -- Es empleado
END
WHERE root_owner_id IS NULL;

-- 4. Crear función helper para obtener el root_owner_id del usuario actual
CREATE OR REPLACE FUNCTION public.current_root_owner_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(up.root_owner_id, up.user_id)
  FROM public.user_profiles up
  WHERE up.user_id = auth.uid()
  LIMIT 1;
$$;

-- 5. Comentarios para documentación
COMMENT ON COLUMN public.user_profiles.root_owner_id IS 'ID del owner raíz. Para owners es igual a user_id, para empleados es el user_id del owner padre.';
COMMENT ON FUNCTION public.current_root_owner_id() IS 'Devuelve el root_owner_id del usuario autenticado. Útil para filtrar datos por empresa en RLS y queries.';
