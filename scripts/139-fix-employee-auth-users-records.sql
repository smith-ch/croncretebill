-- ============================================================================
-- Script 139: Corregir registros de empleados en auth.users
-- ============================================================================
-- Los empleados se crean con create_employee_direct() que inserta valores
-- que pueden diferir de los usuarios creados por signup normal. Esto puede
-- causar error 500 al hacer login.
--
-- Este script alinea los registros de empleados con el formato de owners.
-- ============================================================================

DO $$
DECLARE
  v_owner_instance_id UUID;
  v_employee_record RECORD;
  v_updated_count INTEGER := 0;
BEGIN
  -- 1. Obtener instance_id de un owner que funcione (smithrodriguez345 o cualquier owner)
  SELECT au.instance_id INTO v_owner_instance_id
  FROM auth.users au
  JOIN public.user_profiles up ON up.user_id = au.id
  WHERE up.parent_user_id IS NULL  -- Es owner
    AND au.instance_id IS NOT NULL
    AND au.instance_id != '00000000-0000-0000-0000-000000000000'::uuid
  LIMIT 1;

  -- Si no hay owner con instance_id, usar NULL (el schema permite NULL)
  IF v_owner_instance_id IS NULL THEN
    SELECT au.instance_id INTO v_owner_instance_id FROM auth.users au LIMIT 1;
  END IF;

  RAISE NOTICE 'Instance ID de referencia: %', v_owner_instance_id;

  -- 2. Actualizar cada empleado en auth.users
  FOR v_employee_record IN 
    SELECT au.id, au.email, au.instance_id, au.confirmation_token, au.recovery_token
    FROM auth.users au
    JOIN public.user_profiles up ON up.user_id = au.id
    WHERE up.parent_user_id IS NOT NULL  -- Es empleado
  LOOP
    -- Actualizar campos que pueden causar problemas con GoTrue
    UPDATE auth.users
    SET 
      instance_id = COALESCE(v_owner_instance_id, instance_id),
      confirmation_token = CASE WHEN confirmation_token = '' OR confirmation_token IS NULL THEN NULL ELSE confirmation_token END,
      recovery_token = CASE WHEN recovery_token = '' OR recovery_token IS NULL THEN NULL ELSE recovery_token END
    WHERE id = v_employee_record.id;

    v_updated_count := v_updated_count + 1;
    RAISE NOTICE 'Actualizado empleado: % (%)', v_employee_record.email, v_employee_record.id;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== RESUMEN ===';
  RAISE NOTICE 'Empleados actualizados en auth.users: %', v_updated_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Prueba el login de un empleado. Si persiste el 500, el problema';
  RAISE NOTICE 'puede estar en Supabase Auth (contactar soporte).';
END $$;
