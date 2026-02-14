-- ============================================================================
-- Script 141: Diagnosticar y Reparar Error 500 en Login de Empleados
-- ============================================================================
-- Problema: Los empleados no pueden hacer login (error 500)
-- Posibles causas:
-- 1. Tokens con strings vacíos '' en lugar de NULL
-- 2. Instance_id incorrecto o ausente
-- 3. Campos faltantes en auth.users
-- 4. Problemas con el trigger handle_new_user
-- ============================================================================

-- PARTE 1: DIAGNÓSTICO
-- ============================================================================

DO $$
DECLARE
  v_owner_record RECORD;
  v_employee_record RECORD;
  v_problem_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'DIAGNÓSTICO DE EMPLEADOS CON PROBLEMAS DE LOGIN';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';

  -- 1. Verificar owners (como referencia de lo que debería estar correcto)
  RAISE NOTICE '1. VERIFICANDO ESTRUCTURA DE OWNERS (REFERENCIA):';
  RAISE NOTICE '-----------------------------------------------------------------';
  
  FOR v_owner_record IN 
    SELECT 
      au.id,
      au.email,
      au.instance_id,
      au.confirmation_token,
      au.recovery_token,
      au.aud,
      au.role,
      au.email_confirmed_at,
      up.display_name
    FROM auth.users au
    JOIN public.user_profiles up ON up.user_id = au.id
    WHERE up.parent_user_id IS NULL  -- Es owner
    LIMIT 3
  LOOP
    RAISE NOTICE 'Owner: % (ID: %)', v_owner_record.email, v_owner_record.id;
    RAISE NOTICE '  - instance_id: %', v_owner_record.instance_id;
    RAISE NOTICE '  - confirmation_token: %', CASE 
      WHEN v_owner_record.confirmation_token IS NULL THEN 'NULL (correcto)' 
      WHEN v_owner_record.confirmation_token = '' THEN 'EMPTY STRING (PROBLEMA)' 
      ELSE 'tiene valor' 
    END;
    RAISE NOTICE '  - recovery_token: %', CASE 
      WHEN v_owner_record.recovery_token IS NULL THEN 'NULL (correcto)' 
      WHEN v_owner_record.recovery_token = '' THEN 'EMPTY STRING (PROBLEMA)' 
      ELSE 'tiene valor' 
    END;
    RAISE NOTICE '  - aud: %', v_owner_record.aud;
    RAISE NOTICE '  - role: %', v_owner_record.role;
    RAISE NOTICE '  - email_confirmed_at: %', CASE 
      WHEN v_owner_record.email_confirmed_at IS NULL THEN 'NULL (PROBLEMA)' 
      ELSE 'confirmado' 
    END;
    RAISE NOTICE '';
  END LOOP;

  -- 2. Verificar empleados con problemas
  RAISE NOTICE '2. VERIFICANDO EMPLEADOS CON POTENCIALES PROBLEMAS:';
  RAISE NOTICE '-----------------------------------------------------------------';
  
  FOR v_employee_record IN 
    SELECT 
      au.id,
      au.email,
      au.instance_id,
      au.confirmation_token,
      au.recovery_token,
      au.aud,
      au.role,
      au.email_confirmed_at,
      up.display_name,
      up.parent_user_id
    FROM auth.users au
    JOIN public.user_profiles up ON up.user_id = au.id
    WHERE up.parent_user_id IS NOT NULL  -- Es empleado
    ORDER BY au.created_at DESC
  LOOP
    DECLARE
      has_problem BOOLEAN := false;
    BEGIN
      RAISE NOTICE 'Empleado: % (ID: %)', v_employee_record.email, v_employee_record.id;
      
      -- Verificar instance_id
      IF v_employee_record.instance_id IS NULL OR 
         v_employee_record.instance_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
        RAISE NOTICE '  ⚠️  PROBLEMA: instance_id incorrecto: %', v_employee_record.instance_id;
        has_problem := true;
      ELSE
        RAISE NOTICE '  ✓  instance_id: OK';
      END IF;
      
      -- Verificar confirmation_token
      IF v_employee_record.confirmation_token = '' THEN
        RAISE NOTICE '  ⚠️  PROBLEMA: confirmation_token es string vacío (debe ser NULL)';
        has_problem := true;
      ELSIF v_employee_record.confirmation_token IS NULL THEN
        RAISE NOTICE '  ✓  confirmation_token: NULL (correcto)';
      ELSE
        RAISE NOTICE '  ⚠️  confirmation_token tiene valor: % (puede ser problema si está expirado)', substring(v_employee_record.confirmation_token, 1, 10);
      END IF;
      
      -- Verificar recovery_token
      IF v_employee_record.recovery_token = '' THEN
        RAISE NOTICE '  ⚠️  PROBLEMA: recovery_token es string vacío (debe ser NULL)';
        has_problem := true;
      ELSIF v_employee_record.recovery_token IS NULL THEN
        RAISE NOTICE '  ✓  recovery_token: NULL (correcto)';
      ELSE
        RAISE NOTICE '  ⚠️  recovery_token tiene valor (puede ser problema)';
      END IF;
      
      -- Verificar email_confirmed_at
      IF v_employee_record.email_confirmed_at IS NULL THEN
        RAISE NOTICE '  ⚠️  PROBLEMA: email no confirmado (email_confirmed_at es NULL)';
        has_problem := true;
      ELSE
        RAISE NOTICE '  ✓  email_confirmed_at: OK';
      END IF;
      
      -- Verificar aud
      IF v_employee_record.aud IS NULL OR v_employee_record.aud != 'authenticated' THEN
        RAISE NOTICE '  ⚠️  PROBLEMA: aud incorrecto: %', v_employee_record.aud;
        has_problem := true;
      ELSE
        RAISE NOTICE '  ✓  aud: authenticated (correcto)';
      END IF;
      
      -- Verificar role
      IF v_employee_record.role IS NULL OR v_employee_record.role != 'authenticated' THEN
        RAISE NOTICE '  ⚠️  PROBLEMA: role incorrecto: %', v_employee_record.role;
        has_problem := true;
      ELSE
        RAISE NOTICE '  ✓  role: authenticated (correcto)';
      END IF;
      
      IF has_problem THEN
        v_problem_count := v_problem_count + 1;
        RAISE NOTICE '  🔴 Este empleado TIENE PROBLEMAS y necesita reparación';
      ELSE
        RAISE NOTICE '  ✅ Este empleado parece estar correcto';
      END IF;
      
      RAISE NOTICE '';
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RESUMEN DE DIAGNÓSTICO';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Empleados con problemas detectados: %', v_problem_count;
  RAISE NOTICE '';
  
  IF v_problem_count > 0 THEN
    RAISE NOTICE '⚠️  Se detectaron problemas. Ejecuta la PARTE 2 para repararlos.';
  ELSE
    RAISE NOTICE '✅ No se detectaron problemas en auth.users';
    RAISE NOTICE '';
    RAISE NOTICE 'Si los empleados aún tienen error 500:';
    RAISE NOTICE '1. Verifica los logs de Supabase Dashboard';
    RAISE NOTICE '2. Verifica que el trigger handle_new_user esté correcto';
    RAISE NOTICE '3. Verifica las políticas RLS de user_profiles';
  END IF;
  RAISE NOTICE '';
END $$;


-- PARTE 2: REPARACIÓN
-- ============================================================================

DO $$
DECLARE
  v_reference_instance_id UUID;
  v_employee_record RECORD;
  v_fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'REPARACIÓN DE EMPLEADOS';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';

  -- 1. Obtener instance_id de referencia de un owner que funcione
  SELECT au.instance_id INTO v_reference_instance_id
  FROM auth.users au
  JOIN public.user_profiles up ON up.user_id = au.id
  WHERE up.parent_user_id IS NULL  -- Es owner
    AND au.instance_id IS NOT NULL
    AND au.instance_id != '00000000-0000-0000-0000-000000000000'::uuid
  LIMIT 1;

  IF v_reference_instance_id IS NULL THEN
    RAISE NOTICE '⚠️  No se encontró instance_id de referencia';
    SELECT au.instance_id INTO v_reference_instance_id 
    FROM auth.users au 
    WHERE au.instance_id IS NOT NULL 
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Instance ID de referencia: %', v_reference_instance_id;
  RAISE NOTICE '';

  -- 2. Reparar cada empleado
  FOR v_employee_record IN 
    SELECT au.id, au.email
    FROM auth.users au
    JOIN public.user_profiles up ON up.user_id = au.id
    WHERE up.parent_user_id IS NOT NULL  -- Es empleado
  LOOP
    BEGIN
      UPDATE auth.users
      SET 
        -- Corregir instance_id
        instance_id = COALESCE(
          CASE 
            WHEN instance_id IS NULL THEN v_reference_instance_id
            WHEN instance_id = '00000000-0000-0000-0000-000000000000'::uuid THEN v_reference_instance_id
            ELSE instance_id
          END,
          v_reference_instance_id
        ),
        -- Corregir confirmation_token (NULL si es string vacío)
        confirmation_token = CASE 
          WHEN confirmation_token = '' THEN NULL 
          ELSE confirmation_token 
        END,
        -- Corregir recovery_token (NULL si es string vacío)
        recovery_token = CASE 
          WHEN recovery_token = '' THEN NULL 
          ELSE recovery_token 
        END,
        -- Asegurar email_confirmed_at (si es NULL, ponerle NOW())
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        -- Asegurar aud y role
        aud = COALESCE(aud, 'authenticated'),
        role = COALESCE(role, 'authenticated')
      WHERE id = v_employee_record.id;

      v_fixed_count := v_fixed_count + 1;
      RAISE NOTICE '✅ Reparado: % (%)', v_employee_record.email, v_employee_record.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Error reparando %: % %', v_employee_record.email, SQLERRM, SQLSTATE;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RESUMEN DE REPARACIÓN';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Empleados reparados: %', v_fixed_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Reparación completada.';
  RAISE NOTICE '';
  RAISE NOTICE 'SIGUIENTE PASO:';
  RAISE NOTICE '1. Prueba el login de un empleado';
  RAISE NOTICE '2. Si aún falla con 500, verifica:';
  RAISE NOTICE '   - Logs de Supabase Dashboard > Authentication';
  RAISE NOTICE '   - Trigger handle_new_user';
  RAISE NOTICE '   - Políticas RLS de user_profiles';
  RAISE NOTICE '';
END $$;
