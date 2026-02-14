-- =====================================================
-- Script 113: Force Clean All Duplicates
-- =====================================================
-- Problema: Aún existen duplicados en user_profiles
-- para el mismo user_id
--
-- Solución: Eliminar forzadamente los duplicados,
-- manteniendo solo el registro de empleado
-- =====================================================

-- Ver duplicados actuales
SELECT 
  user_id,
  email,
  parent_user_id,
  display_name,
  COUNT(*) OVER (PARTITION BY user_id) as duplicate_count
FROM user_profiles
WHERE user_id IN (
  SELECT user_id
  FROM user_profiles
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
ORDER BY user_id, parent_user_id NULLS FIRST;

-- Eliminar TODOS los duplicados donde parent_user_id es NULL
-- (estos son los creados por el trigger, no son empleados reales)
DELETE FROM user_profiles
WHERE id IN (
  SELECT up1.id
  FROM user_profiles up1
  WHERE up1.parent_user_id IS NULL
  AND EXISTS (
    -- Solo eliminar si existe otro registro del mismo user_id con parent
    SELECT 1
    FROM user_profiles up2
    WHERE up2.user_id = up1.user_id
    AND up2.parent_user_id IS NOT NULL
    AND up2.id != up1.id
  )
);

-- Verificar que no quedan duplicados
SELECT 
  user_id,
  COUNT(*) as count,
  ARRAY_AGG(email) as emails
FROM user_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Mensaje de confirmación
DO $$
DECLARE
  remaining_duplicates INT;
BEGIN
  SELECT COUNT(*)
  INTO remaining_duplicates
  FROM (
    SELECT user_id
    FROM user_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  IF remaining_duplicates = 0 THEN
    RAISE NOTICE '✅ Script 113 completado - Todos los duplicados eliminados';
  ELSE
    RAISE NOTICE '⚠️ Aún quedan % usuarios con duplicados', remaining_duplicates;
  END IF;
END $$;
