-- Script de verificación: Estado del empleado y políticas RLS

-- 1. Ver información del empleado creado
SELECT 
  user_id,
  email,
  display_name,
  parent_user_id,
  is_active,
  can_create_invoices,
  can_view_finances,
  can_manage_inventory,
  can_manage_clients,
  role_id
FROM user_profiles
WHERE parent_user_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verificar políticas RLS en la tabla clients
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'clients'
AND policyname LIKE '%Employees%'
ORDER BY policyname;

-- 3. Verificar políticas RLS en la tabla products
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'products'
AND policyname LIKE '%Employees%'
ORDER BY policyname;

-- 4. Verificar políticas RLS en la tabla services
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'services'
AND policyname LIKE '%Employees%'
ORDER BY policyname;

-- 5. Verificar políticas RLS en la tabla invoices
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'invoices'
AND policyname LIKE '%Employees%'
ORDER BY policyname;

-- 6. Ver el owner del empleado
SELECT 
  e.email as empleado_email,
  e.display_name as empleado_nombre,
  o.email as owner_email,
  o.display_name as owner_nombre,
  e.can_create_invoices,
  e.can_manage_clients,
  e.can_manage_inventory
FROM user_profiles e
LEFT JOIN user_profiles o ON e.parent_user_id = o.user_id
WHERE e.parent_user_id IS NOT NULL
ORDER BY e.created_at DESC
LIMIT 5;
