-- Script para buscar el usuario Carlos Peguero
-- Fecha: 2026-02-03

-- Buscar por patrones similares en el email
SELECT 
  user_id,
  email,
  is_active,
  created_at
FROM user_profiles
WHERE 
  email ILIKE '%carlos%'
  OR email ILIKE '%peguero%'
ORDER BY email;

-- Ver todos los usuarios registrados (primeros 50)
SELECT 
  user_id,
  email,
  is_active,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 50;
