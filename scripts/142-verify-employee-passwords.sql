-- ============================================================================
-- Script 142: Verificar y Reparar Contraseñas de Empleados
-- ============================================================================
-- A veces el error 500 ocurre porque:
-- 1. El encrypted_password está vacío o NULL
-- 2. El formato de bcrypt no es correcto
-- 3. El algoritmo usado no es compatible con GoTrue
-- ============================================================================

-- VERIFICACIÓN DE CONTRASEÑAS
-- ============================================================================

DO $$
DECLARE
  v_employee_record RECORD;
  v_problem_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'VERIFICACIÓN DE CONTRASEÑAS DE EMPLEADOS';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';

  FOR v_employee_record IN 
    SELECT 
      au.id,
      au.email,
      au.encrypted_password,
      length(au.encrypted_password) as pwd_length,
      substring(au.encrypted_password, 1, 4) as pwd_prefix,
      up.display_name
    FROM auth.users au
    JOIN public.user_profiles up ON up.user_id = au.id
    WHERE up.parent_user_id IS NOT NULL  -- Es empleado
  LOOP
    RAISE NOTICE 'Empleado: % (%)', v_employee_record.email, v_employee_record.display_name;
    
    -- Verificar encrypted_password
    IF v_employee_record.encrypted_password IS NULL THEN
      RAISE NOTICE '  ❌ PROBLEMA CRÍTICO: encrypted_password es NULL';
      v_problem_count := v_problem_count + 1;
    ELSIF v_employee_record.encrypted_password = '' THEN
      RAISE NOTICE '  ❌ PROBLEMA CRÍTICO: encrypted_password está vacío';
      v_problem_count := v_problem_count + 1;
    ELSIF v_employee_record.pwd_length < 50 THEN
      RAISE NOTICE '  ⚠️  ADVERTENCIA: encrypted_password es demasiado corto (% chars)', v_employee_record.pwd_length;
      v_problem_count := v_problem_count + 1;
    ELSIF v_employee_record.pwd_prefix != '$2a$' AND v_employee_record.pwd_prefix != '$2b$' THEN
      RAISE NOTICE '  ⚠️  ADVERTENCIA: encrypted_password no parece ser bcrypt (prefijo: %)', v_employee_record.pwd_prefix;
      v_problem_count := v_problem_count + 1;
    ELSE
      RAISE NOTICE '  ✅ encrypted_password parece correcto (% chars, prefijo: %)', 
        v_employee_record.pwd_length, 
        v_employee_record.pwd_prefix;
    END IF;
    
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RESUMEN';
  RAISE NOTICE '=================================================================';
  
  IF v_problem_count > 0 THEN
    RAISE NOTICE '⚠️  Se detectaron % empleados con problemas de contraseña', v_problem_count;
    RAISE NOTICE '';
    RAISE NOTICE 'NOTA: No podemos resetear las contraseñas automáticamente.';
    RAISE NOTICE 'Opciones:';
    RAISE NOTICE '1. Que cada empleado use "Olvidé mi contraseña" para resetear';
    RAISE NOTICE '2. Eliminar y recrear los empleados con contraseñas nuevas';
    RAISE NOTICE '3. Usar la función set_employee_password() si existe';
  ELSE
    RAISE NOTICE '✅ Todas las contraseñas parecen correctas';
  END IF;
  
  RAISE NOTICE '';
END $$;


-- FUNCIÓN AUXILIAR: Resetear contraseña de empleado (solo owners)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_employee_password(
  employee_user_id UUID,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_employee_parent_id UUID;
  v_new_encrypted_password TEXT;
BEGIN
  -- Obtener el ID del usuario que llama
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No autenticado'
    );
  END IF;
  
  -- Verificar que el empleado existe y obtener su parent_user_id
  SELECT parent_user_id INTO v_employee_parent_id
  FROM public.user_profiles
  WHERE user_id = employee_user_id
    AND parent_user_id IS NOT NULL;  -- Es empleado
  
  IF v_employee_parent_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Empleado no encontrado o no es un empleado válido'
    );
  END IF;
  
  -- Verificar que el caller es el owner del empleado
  IF v_employee_parent_id != v_caller_id THEN
    -- También verificar si el caller es el root_owner
    DECLARE
      v_employee_root_owner UUID;
    BEGIN
      SELECT root_owner_id INTO v_employee_root_owner
      FROM public.user_profiles
      WHERE user_id = employee_user_id;
      
      IF v_employee_root_owner != v_caller_id THEN
        RETURN json_build_object(
          'success', false,
          'error', 'No tienes permisos para resetear la contraseña de este empleado'
        );
      END IF;
    END;
  END IF;
  
  -- Encriptar la nueva contraseña
  v_new_encrypted_password := extensions.crypt(new_password, extensions.gen_salt('bf'));
  
  -- Actualizar la contraseña en auth.users
  UPDATE auth.users
  SET 
    encrypted_password = v_new_encrypted_password,
    updated_at = NOW()
  WHERE id = employee_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No se pudo actualizar la contraseña'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Contraseña actualizada exitosamente'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Error: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION reset_employee_password TO authenticated;

COMMENT ON FUNCTION reset_employee_password IS 'Permite a un owner resetear la contraseña de sus empleados';


-- VERIFICAR OTROS CAMPOS CRÍTICOS
-- ============================================================================

DO $$
DECLARE
  v_employee_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'VERIFICACIÓN ADICIONAL DE CAMPOS EN AUTH.USERS';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';

  FOR v_employee_record IN 
    SELECT 
      au.id,
      au.email,
      au.aud,
      au.role,
      au.email_confirmed_at,
      au.last_sign_in_at,
      au.confirmation_sent_at,
      au.recovery_sent_at,
      au.email_change_sent_at,
      au.banned_until,
      au.deleted_at
    FROM auth.users au
    JOIN public.user_profiles up ON up.user_id = au.id
    WHERE up.parent_user_id IS NOT NULL
  LOOP
    RAISE NOTICE 'Empleado: %', v_employee_record.email;
    
    -- Verificaciones
    IF v_employee_record.aud IS NULL OR v_employee_record.aud != 'authenticated' THEN
      RAISE NOTICE '  ⚠️  aud: % (debería ser "authenticated")', v_employee_record.aud;
    ELSE
      RAISE NOTICE '  ✅ aud: authenticated';
    END IF;
    
    IF v_employee_record.role IS NULL OR v_employee_record.role != 'authenticated' THEN
      RAISE NOTICE '  ⚠️  role: % (debería ser "authenticated")', v_employee_record.role;
    ELSE
      RAISE NOTICE '  ✅ role: authenticated';
    END IF;
    
    IF v_employee_record.email_confirmed_at IS NULL THEN
      RAISE NOTICE '  ⚠️  email_confirmed_at: NULL (el email no está confirmado)';
    ELSE
      RAISE NOTICE '  ✅ email_confirmed_at: %', v_employee_record.email_confirmed_at;
    END IF;
    
    IF v_employee_record.last_sign_in_at IS NOT NULL THEN
      RAISE NOTICE '  ℹ️  last_sign_in_at: %', v_employee_record.last_sign_in_at;
    ELSE
      RAISE NOTICE '  ℹ️  last_sign_in_at: NULL (nunca ha iniciado sesión)';
    END IF;
    
    IF v_employee_record.banned_until IS NOT NULL THEN
      RAISE NOTICE '  ❌ BLOQUEADO hasta: %', v_employee_record.banned_until;
    END IF;
    
    IF v_employee_record.deleted_at IS NOT NULL THEN
      RAISE NOTICE '  ❌ ELIMINADO en: %', v_employee_record.deleted_at;
    END IF;
    
    RAISE NOTICE '';
  END LOOP;
END $$;
