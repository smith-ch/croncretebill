-- Ver si existe una tabla de roles
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%role%' 
  AND table_schema = 'public';

-- Ver las funciones completas para entender qué buscan
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname IN ('is_super_admin', 'is_subscription_manager');

-- Ver si hay roles predefinidos
SELECT * FROM user_roles LIMIT 10;
