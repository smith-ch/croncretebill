-- Script 71: Specific fix for user aguacostassuprema@gmail.com
-- Fecha: 2026-03-09
-- User ID: 49a634f7-7f99-4a15-8468-32d1225aee31

BEGIN;

-- 1. Verificar y mostrar estado actual del usuario
DO $$
DECLARE
  v_user_id UUID := '49a634f7-7f99-4a15-8468-32d1225aee31';
  v_profile RECORD;
  v_auth_user RECORD;
BEGIN
  -- Check auth.users
  SELECT id, email INTO v_auth_user FROM auth.users WHERE id = v_user_id;
  IF v_auth_user.id IS NULL THEN
    RAISE EXCEPTION 'Usuario no existe en auth.users';
  END IF;
  RAISE NOTICE 'Auth user found: %', v_auth_user.email;
  
  -- Check user_profiles
  SELECT * INTO v_profile FROM public.user_profiles WHERE user_id = v_user_id;
  IF v_profile.user_id IS NULL THEN
    RAISE NOTICE 'No profile found, creating...';
  ELSE
    RAISE NOTICE 'Profile found - root_owner_id: %, is_active: %', v_profile.root_owner_id, v_profile.is_active;
  END IF;
END $$;

-- 2. Asegurar que el usuario tiene un perfil completo
INSERT INTO public.user_profiles (user_id, root_owner_id, display_name, is_active)
SELECT 
  '49a634f7-7f99-4a15-8468-32d1225aee31',
  '49a634f7-7f99-4a15-8468-32d1225aee31',
  COALESCE((SELECT email FROM auth.users WHERE id = '49a634f7-7f99-4a15-8468-32d1225aee31'), 'Usuario'),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE user_id = '49a634f7-7f99-4a15-8468-32d1225aee31'
);

-- 3. Actualizar el perfil para asegurar root_owner_id correcto
UPDATE public.user_profiles
SET 
  root_owner_id = '49a634f7-7f99-4a15-8468-32d1225aee31',
  is_active = true
WHERE user_id = '49a634f7-7f99-4a15-8468-32d1225aee31';

-- 4. IMPORTANTE: Crear políticas RLS más permisivas para clients
-- Primero verificar qué políticas existen
DO $$
DECLARE
  pol RECORD;
BEGIN
  RAISE NOTICE '=== Current RLS policies on clients ===';
  FOR pol IN 
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'clients'
  LOOP
    RAISE NOTICE 'Policy: %, Command: %, USING: %, WITH CHECK: %', 
      pol.policyname, pol.cmd, pol.qual, pol.with_check;
  END LOOP;
END $$;

-- 5. Eliminar políticas restrictivas y crear permisivas
DROP POLICY IF EXISTS "Users can insert company clients" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clients;

-- Crear política permisiva que permite insertar si el user_id coincide con auth.uid() o si owner_id = auth.uid()
CREATE POLICY "Users can insert clients" ON public.clients
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() 
    OR owner_id = auth.uid()
    OR owner_id = (SELECT root_owner_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- 6. También arreglar políticas de SELECT, UPDATE, DELETE
DROP POLICY IF EXISTS "Users can view company clients" ON public.clients;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clients;

CREATE POLICY "Users can view clients" ON public.clients
  FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR owner_id = auth.uid()
    OR owner_id = (SELECT root_owner_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update company clients" ON public.clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clients;

CREATE POLICY "Users can update clients" ON public.clients
  FOR UPDATE 
  USING (
    user_id = auth.uid() 
    OR owner_id = auth.uid()
    OR owner_id = (SELECT root_owner_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete company clients" ON public.clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clients;

CREATE POLICY "Users can delete clients" ON public.clients
  FOR DELETE 
  USING (
    user_id = auth.uid() 
    OR owner_id = auth.uid()
    OR owner_id = (SELECT root_owner_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- 7. Verificar resultado final
DO $$
DECLARE
  pol RECORD;
BEGIN
  RAISE NOTICE '=== NEW RLS policies on clients ===';
  FOR pol IN 
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE tablename = 'clients'
  LOOP
    RAISE NOTICE 'Policy: %, Command: %', pol.policyname, pol.cmd;
  END LOOP;
END $$;

-- 8. Verificar estado final del usuario
SELECT 
  up.user_id,
  up.root_owner_id,
  up.display_name,
  up.is_active,
  au.email
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.user_id
WHERE up.user_id = '49a634f7-7f99-4a15-8468-32d1225aee31';

SELECT 'Script 71: User permissions fixed - Please test creating a client now' as status;

COMMIT;
