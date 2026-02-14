-- ============================================================================
-- Script 137: Diagnóstico completo del error 500 en login
-- ============================================================================
-- Ejecuta este script y revisa los resultados para identificar la causa
-- ============================================================================

-- 1. TRIGGERS en auth.users (deberían estar vacíos o solo internos)
SELECT '=== 1. TRIGGERS en auth.users ===' as seccion;
SELECT tgname as trigger_name, 
       CASE WHEN tgisinternal THEN 'INTERNO' ELSE 'PERSONALIZADO' END as tipo
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'auth'
ORDER BY tgisinternal, tgname;

-- 2. Foreign keys DESDE otras tablas HACIA auth.users (pueden causar 500)
SELECT '=== 2. Tablas que referencian auth.users ===' as seccion;
SELECT 
  tc.table_schema || '.' || tc.table_name as tabla,
  kcu.column_name,
  ccu.table_schema || '.' || ccu.table_name as referencia
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'auth' AND ccu.table_name = 'users'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 3. Funciones que se ejecutan en auth (hooks, triggers)
SELECT '=== 3. Funciones en schema auth o que usan auth ===' as seccion;
SELECT n.nspname as schema, p.proname as funcion
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('auth', 'public')
  AND p.proname IN ('handle_new_user', 'on_auth_user_created', 'custom_access_token_hook', 'custom_claims')
ORDER BY n.nspname, p.proname;

-- 4. Usuario test0 (empleado) - verificar que existe y está bien
SELECT '=== 4. Estado del empleado test0@gmail.com ===' as seccion;
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmado,
  au.raw_user_meta_data,
  up.id as profile_id,
  up.parent_user_id,
  up.is_active as profile_activo
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id
WHERE au.email = 'test0@gmail.com';

-- 5. Verificar permisos del rol supabase_auth_admin (común causa de 500)
SELECT '=== 5. Privilegios en auth.users ===' as seccion;
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY grantee, privilege_type;

-- 6. Verificar que auth.users es accesible
SELECT '=== 6. Conteo de usuarios en auth.users ===' as seccion;
SELECT COUNT(*) as total_usuarios FROM auth.users;
