-- Script 74: FIX FOREIGN KEY - El user_id no existe en profiles
-- El error real es: clients_user_id_fkey violation

-- PASO 1: Verificar si el usuario existe en la tabla profiles
SELECT 
  'auth.users' as tabla,
  id,
  email
FROM auth.users 
WHERE id = '49a634f7-7f99-4a15-8468-32d1225aee31';

SELECT 
  'profiles' as tabla,
  id,
  email
FROM public.profiles 
WHERE id = '49a634f7-7f99-4a15-8468-32d1225aee31';

-- PASO 2: Ver la estructura de la FK en clients
SELECT 
  conname,
  pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'public.clients'::regclass
  AND contype = 'f';

-- PASO 3: CREAR el usuario en la tabla profiles si no existe
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id = '49a634f7-7f99-4a15-8468-32d1225aee31'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '49a634f7-7f99-4a15-8468-32d1225aee31'
  );

-- PASO 4: Crear TODOS los perfiles faltantes para usuarios en auth.users
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email)
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- PASO 5: Verificar que ahora existe
SELECT 
  p.id,
  p.email,
  p.full_name,
  'EXISTS' as status
FROM public.profiles p
WHERE id = '49a634f7-7f99-4a15-8468-32d1225aee31';

-- PASO 6: También asegurar user_profiles
INSERT INTO public.user_profiles (user_id, root_owner_id, display_name, is_active)
SELECT 
  '49a634f7-7f99-4a15-8468-32d1225aee31',
  '49a634f7-7f99-4a15-8468-32d1225aee31',
  COALESCE((SELECT email FROM auth.users WHERE id = '49a634f7-7f99-4a15-8468-32d1225aee31'), 'Usuario'),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE user_id = '49a634f7-7f99-4a15-8468-32d1225aee31'
);

UPDATE public.user_profiles
SET root_owner_id = '49a634f7-7f99-4a15-8468-32d1225aee31',
    is_active = true
WHERE user_id = '49a634f7-7f99-4a15-8468-32d1225aee31';

SELECT '=== PERFIL CREADO ===' as status;
SELECT 'Ahora intenta crear el cliente nuevamente' as next_step;
