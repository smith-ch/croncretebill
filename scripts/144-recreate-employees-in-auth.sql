-- ============================================================================
-- Script 144: Recrear Empleados en auth.users
-- ============================================================================
-- Problema: Los empleados existen en user_profiles pero NO en auth.users
-- Solución: Usar la función create_employee_direct para crearlos correctamente
-- ============================================================================

DO $$
DECLARE
  v_employee RECORD;
  v_result JSON;
  v_temp_password TEXT := 'Empleado123!'; -- Contraseña temporal
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RECREANDO EMPLEADOS USANDO create_employee_direct()';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Contraseña temporal: %', v_temp_password;
  RAISE NOTICE '';

  -- Procesar cada empleado que no existe en auth.users
  FOR v_employee IN 
    SELECT 
      up.user_id,
      up.email,
      up.display_name,
      up.parent_user_id,
      up.can_create_invoices,
      up.can_view_finances,
      up.can_manage_inventory,
      up.can_manage_clients,
      up.department,
      up.job_position
    FROM public.user_profiles up
    WHERE up.parent_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = up.user_id
    )
  LOOP
    BEGIN
      RAISE NOTICE '---------------------------------------------';
      RAISE NOTICE 'Procesando: % (%)', v_employee.display_name, v_employee.email;
      
      -- Primero eliminar el perfil existente (incompleto)
      DELETE FROM public.user_profiles WHERE user_id = v_employee.user_id;
      RAISE NOTICE '  Perfil anterior eliminado';
      
      -- Recrear usando create_employee_direct
      SELECT create_employee_direct(
        v_employee.email,
        v_temp_password,
        v_employee.display_name,
        v_employee.parent_user_id,
        COALESCE(v_employee.can_create_invoices, false),
        COALESCE(v_employee.can_view_finances, false),
        COALESCE(v_employee.can_manage_inventory, false),
        COALESCE(v_employee.can_manage_clients, false),
        v_employee.department,
        v_employee.job_position
      ) INTO v_result;
      
      IF v_result->>'success' = 'true' THEN
        RAISE NOTICE '  Recreado exitosamente';
        RAISE NOTICE '  Nuevo ID: %', v_result->>'user_id';
      ELSE
        RAISE NOTICE '  Error: %', v_result->>'error';
      END IF;
      
      RAISE NOTICE '';

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '  Error: % %', SQLERRM, SQLSTATE;
        RAISE NOTICE '';
    END;
  END LOOP;

  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'PROCESO COMPLETADO';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CREDENCIALES DE LOGIN:';
  RAISE NOTICE '';
  RAISE NOTICE '  URL: http://localhost:3000';
  RAISE NOTICE '  Password: %', v_temp_password;
  RAISE NOTICE '';
  RAISE NOTICE '  Emails disponibles:';
  
  FOR v_employee IN 
    SELECT email, display_name 
    FROM public.user_profiles 
    WHERE parent_user_id IS NOT NULL
  LOOP
    RAISE NOTICE '    - % (%)', v_employee.email, v_employee.display_name;
  END LOOP;
  
  RAISE NOTICE '';
END $$;