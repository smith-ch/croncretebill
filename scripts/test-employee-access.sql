-- Script de prueba: Verificar acceso del empleado a datos del owner

-- PASO 1: Obtener los IDs
SELECT 
  user_id,
  email,
  display_name,
  parent_user_id,
  'EMPLEADO' as tipo
FROM user_profiles
WHERE email = 'empleado@test.com';

SELECT 
  user_id,
  email,
  display_name,
  parent_user_id,
  'OWNER' as tipo
FROM user_profiles
WHERE email = 'smith_18@hotmail.com';

-- PASO 2: Verificar clientes del owner
SELECT 
  id,
  name,
  email,
  user_id,
  'CLIENTE DEL OWNER' as tipo
FROM clients
WHERE user_id = '5d8251e6-f36e-490e-a50e-9118daf475ac' -- ID del owner
ORDER BY created_at DESC
LIMIT 5;

-- PASO 3: Verificar productos del owner
SELECT 
  id,
  name,
  price,
  user_id,
  'PRODUCTO DEL OWNER' as tipo
FROM products
WHERE user_id = '5d8251e6-f36e-490e-a50e-9118daf475ac'
ORDER BY created_at DESC
LIMIT 5;

-- PASO 4: Verificar servicios del owner
SELECT 
  id,
  name,
  price,
  user_id,
  'SERVICIO DEL OWNER' as tipo
FROM services
WHERE user_id = '5d8251e6-f36e-490e-a50e-9118daf475ac'
ORDER BY created_at DESC
LIMIT 5;

-- PASO 5: Verificar que la consulta de empleado a datos del owner funciona
-- Esta consulta simula lo que debería ver el empleado cuando consulta clientes
SELECT 
  c.id,
  c.name,
  c.email,
  c.user_id as owner_id,
  'Cliente accesible por empleado' as nota
FROM clients c
WHERE c.user_id IN (
  SELECT parent_user_id 
  FROM user_profiles 
  WHERE email = 'empleado@test.com'
  AND parent_user_id IS NOT NULL
)
ORDER BY c.created_at DESC
LIMIT 5;

-- PASO 6: Verificar productos accesibles por el empleado
SELECT 
  p.id,
  p.name,
  p.price,
  p.user_id as owner_id,
  'Producto accesible por empleado' as nota
FROM products p
WHERE p.user_id IN (
  SELECT parent_user_id 
  FROM user_profiles 
  WHERE email = 'empleado@test.com'
  AND parent_user_id IS NOT NULL
)
ORDER BY p.created_at DESC
LIMIT 5;

-- PASO 7: Verificar servicios accesibles por el empleado
SELECT 
  s.id,
  s.name,
  s.price,
  s.user_id as owner_id,
  'Servicio accesible por empleado' as nota
FROM services s
WHERE s.user_id IN (
  SELECT parent_user_id 
  FROM user_profiles 
  WHERE email = 'empleado@test.com'
  AND parent_user_id IS NOT NULL
)
ORDER BY s.created_at DESC
LIMIT 5;
