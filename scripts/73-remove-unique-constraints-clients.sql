-- Script 73: FIX UNIQUE CONSTRAINT en clients (causa del 409)
-- El error 409 es CONSTRAINT violation, NO RLS

-- PASO 1: Ver TODOS los constraints UNIQUE en clients
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'public.clients'::regclass
  AND contype = 'u';  -- 'u' = unique

-- PASO 2: Ver índices UNIQUE
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'clients' 
  AND schemaname = 'public'
  AND indexdef LIKE '%UNIQUE%';

-- PASO 3: ELIMINAR constraints únicos problemáticos
-- (excepto el PRIMARY KEY)

-- Eliminar constraint de RNC único si existe
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_rnc_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_rnc_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS unique_client_rnc;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_rnc_unique;

-- Eliminar constraint de cédula único si existe  
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_cedula_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_cedula_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS unique_client_cedula;

-- Eliminar constraint de email único si existe
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_email_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_email_key;

-- Eliminar constraint de nombre único si existe
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_name_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_name_key;

-- PASO 4: Eliminar índices únicos problemáticos
DROP INDEX IF EXISTS clients_rnc_key;
DROP INDEX IF EXISTS clients_cedula_key;
DROP INDEX IF EXISTS clients_email_key;
DROP INDEX IF EXISTS idx_clients_unique_rnc;
DROP INDEX IF EXISTS idx_clients_unique_cedula;
DROP INDEX IF EXISTS unique_client_rnc_per_user;
DROP INDEX IF EXISTS unique_client_cedula_per_user;

-- PASO 5: Verificar constraints restantes
SELECT 
  conname AS constraint_name,
  contype AS type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'public.clients'::regclass;

-- PASO 6: Verificar índices restantes
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'clients' AND schemaname = 'public';

SELECT '=== UNIQUE CONSTRAINTS ELIMINADOS ===' as status;
SELECT 'Intenta crear el cliente nuevamente' as next_step;
