-- ============================================================================
-- Script 147: Eliminar Empleados con Error 500
-- ============================================================================
-- Elimina empleados que NO están en auth.users (causan error 500)
-- Los owners deberán recrearlos desde el panel
-- ============================================================================

DO $$
DECLARE
  v_employee RECORD;
  v_deleted_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'ELIMINANDO EMPLEADOS CON ERROR 500';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  
  -- Mostrar empleados que se eliminarán
  RAISE NOTICE 'Empleados que se eliminarán (NO están en auth.users):';
  RAISE NOTICE '';
  
  FOR v_employee IN 
    SELECT 
      up.user_id,
      up.email,
      up.display_name,
      up.parent_user_id
    FROM public.user_profiles up
    WHERE up.parent_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = up.user_id
    )
  LOOP
    RAISE NOTICE '  - % (%) - Owner ID: %', 
      v_employee.display_name, 
      v_employee.email,
      v_employee.parent_user_id;
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Total a eliminar: %', v_deleted_count;
  RAISE NOTICE '';
  
  IF v_deleted_count = 0 THEN
    RAISE NOTICE 'No hay empleados con error para eliminar.';
  ELSE
    -- Eliminar los perfiles incompletos
    DELETE FROM public.user_profiles
    WHERE parent_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = user_profiles.user_id
    );
    
    RAISE NOTICE 'Empleados eliminados exitosamente.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'PROCESO COMPLETADO';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SIGUIENTE PASO:';
  RAISE NOTICE 'Los propietarios deben recrear a sus empleados desde:';
  RAISE NOTICE '  http://localhost:3000/settings/employee-config';
  RAISE NOTICE '';
  RAISE NOTICE 'Los nuevos empleados se crearán correctamente y podrán hacer login.';
  RAISE NOTICE '';
END $$;

-- Verificar que no quedan empleados con error
SELECT 
  COUNT(*) as empleados_con_error
FROM public.user_profiles up
WHERE up.parent_user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = up.user_id
);
