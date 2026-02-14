-- =====================================================
-- Script 111: Clean Duplicate User Profiles
-- =====================================================
-- Problema: Hay registros duplicados en user_profiles
-- con el mismo user_id (uno del trigger, otro de create_employee_direct)
--
-- Solución: Mantener solo el registro de empleado (con parent_user_id)
-- y eliminar el duplicado creado por el trigger
-- =====================================================

-- Ver duplicados antes de limpiar
SELECT 
  user_id,
  COUNT(*) as count,
  ARRAY_AGG(id) as profile_ids,
  ARRAY_AGG(parent_user_id) as parents
FROM user_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Eliminar duplicados: mantener solo el que tiene parent_user_id no null
-- Para cada user_id con duplicados, eliminar los que NO son empleados
DELETE FROM user_profiles
WHERE id IN (
  SELECT id
  FROM user_profiles up
  WHERE parent_user_id IS NULL  -- Este es el creado por el trigger (no es empleado)
  AND EXISTS (
    -- Verificar que hay otro registro con el mismo user_id que SÍ es empleado
    SELECT 1
    FROM user_profiles up2
    WHERE up2.user_id = up.user_id
    AND up2.parent_user_id IS NOT NULL
  )
);

-- Verificar que no quedan duplicados
SELECT 
  user_id,
  COUNT(*) as count
FROM user_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Mensaje de confirmación
DO $$
DECLARE
  duplicate_count INT;
BEGIN
  SELECT COUNT(DISTINCT user_id)
  INTO duplicate_count
  FROM (
    SELECT user_id
    FROM user_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE '✅ Script 111 completado - No quedan duplicados';
  ELSE
    RAISE NOTICE '⚠️ Aún hay % usuarios con duplicados', duplicate_count;
  END IF;
END $$;
