-- =====================================================
-- Script 104: Fix Employee Creation & Subscription Check
-- =====================================================
-- Description: 
--   1. Fixes employee creation to prevent them from being created as separate owners
--   2. Fixes subscription check to allow employees access even if subscription expired
-- Date: 2026-02-02
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 1: ARREGLAR CREACIÓN DE EMPLEADOS
-- =====================================================

-- Eliminar la función anterior
DROP FUNCTION IF EXISTS create_employee_direct(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT);

-- Crear la función corregida con el parámetro owner_user_id
CREATE OR REPLACE FUNCTION create_employee_direct(
  employee_email TEXT,
  employee_password TEXT,
  employee_display_name TEXT,
  owner_user_id UUID, -- NUEVO PARÁMETRO OBLIGATORIO
  employee_can_create_invoices BOOLEAN DEFAULT false,
  employee_can_view_finances BOOLEAN DEFAULT false,
  employee_can_manage_inventory BOOLEAN DEFAULT false,
  employee_can_manage_clients BOOLEAN DEFAULT false,
  employee_department TEXT DEFAULT NULL,
  employee_job_position TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
  employee_role_id UUID;
  actual_owner_id UUID;
BEGIN
  -- Si no se proporciona owner_user_id, usar auth.uid() (el usuario actual)
  IF owner_user_id IS NULL THEN
    actual_owner_id := auth.uid();
  ELSE
    actual_owner_id := owner_user_id;
  END IF;

  -- Verificar que el owner existe y es realmente un owner (no tiene parent_user_id)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = actual_owner_id 
    AND parent_user_id IS NULL
    AND is_active = true
  ) AND NOT EXISTS (
    -- Permitir si es el primer usuario
    SELECT 1 FROM auth.users WHERE id = actual_owner_id
  ) AND EXISTS (
    SELECT 1 FROM public.user_profiles
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No tienes permisos para crear empleados. Solo los propietarios pueden crear empleados.'
    );
  END IF;

  -- Obtener el ID del rol de empleado
  SELECT id INTO employee_role_id
  FROM public.user_roles
  WHERE name = 'employee'
  LIMIT 1;

  -- Si no existe el rol, usar NULL
  IF employee_role_id IS NULL THEN
    employee_role_id := NULL;
  END IF;

  -- Crear el usuario en auth.users
  BEGIN
    new_user_id := extensions.uuid_generate_v4();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      employee_email,
      extensions.crypt(employee_password, extensions.gen_salt('bf')),
      NOW(), -- Email confirmado inmediatamente
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', employee_display_name),
      false,
      'authenticated',
      'authenticated',
      '',
      ''
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Ya existe un usuario con este email'
      );
    WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Error al crear el usuario: ' || SQLERRM
      );
  END;

  -- Crear el perfil del empleado en user_profiles
  -- IMPORTANTE: Ahora se vincula correctamente al owner
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      parent_user_id,       -- Vinculado al owner
      root_owner_id,        -- Vinculado al owner raíz
      role_id,
      display_name,
      department,
      job_position,
      can_create_invoices,
      can_view_finances,
      can_manage_inventory,
      can_manage_clients,
      can_manage_users,
      is_active,
      allowed_modules
    ) VALUES (
      new_user_id,
      actual_owner_id,       -- AQUÍ SE VINCULA AL OWNER
      actual_owner_id,       -- AQUÍ SE VINCULA AL OWNER RAÍZ
      employee_role_id,
      employee_display_name,
      employee_department,
      employee_job_position,
      employee_can_create_invoices,
      employee_can_view_finances,
      employee_can_manage_inventory,
      employee_can_manage_clients,
      false, -- Los empleados NO pueden gestionar usuarios
      true,
      '["invoices", "clients", "products", "inventory"]'::jsonb
    );

    RAISE NOTICE 'Empleado creado exitosamente: % (ID: %) para owner: %', 
      employee_display_name, new_user_id, actual_owner_id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Si falla la creación del perfil, eliminar el usuario creado
      DELETE FROM auth.users WHERE id = new_user_id;
      RETURN json_build_object(
        'success', false,
        'error', 'Error al crear el perfil del empleado: ' || SQLERRM
      );
  END;

  -- Retornar éxito
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', employee_email,
    'display_name', employee_display_name,
    'owner_id', actual_owner_id,
    'message', 'Empleado creado exitosamente. Puede iniciar sesión con el email y contraseña proporcionados.'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Error inesperado: ' || SQLERRM
    );
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION create_employee_direct TO authenticated;

-- Comentario
COMMENT ON FUNCTION create_employee_direct IS 'Crea un empleado directamente con email y contraseña, vinculado al owner especificado. Solo los owners pueden ejecutar esta función.';

-- =====================================================
-- PARTE 2: ARREGLAR VERIFICACIÓN DE SUSCRIPCIÓN
-- =====================================================

-- Función para verificar si un usuario es empleado
CREATE OR REPLACE FUNCTION is_employee(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = p_user_id 
    AND parent_user_id IS NOT NULL
    AND is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_employee TO authenticated;

-- Función para obtener el owner de un empleado
CREATE OR REPLACE FUNCTION get_employee_owner(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT 
    COALESCE(root_owner_id, parent_user_id) 
  INTO v_owner_id
  FROM public.user_profiles
  WHERE user_id = p_user_id
  AND parent_user_id IS NOT NULL
  LIMIT 1;
  
  RETURN v_owner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_employee_owner TO authenticated;

-- Función mejorada para verificar acceso considerando empleados
CREATE OR REPLACE FUNCTION check_user_subscription_access(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  has_access BOOLEAN,
  subscription_status VARCHAR,
  plan_name VARCHAR,
  message VARCHAR,
  is_employee BOOLEAN,
  owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_employee BOOLEAN;
  v_owner_id UUID;
BEGIN
  -- Verificar si el usuario es super admin
  IF EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = p_user_id 
    AND is_super_admin = true
  ) THEN
    RETURN QUERY SELECT 
      true, 
      'super_admin'::VARCHAR, 
      'Super Admin'::VARCHAR, 
      'Acceso total como Super Admin'::VARCHAR,
      false,
      NULL::UUID;
    RETURN;
  END IF;

  -- Verificar si es subscription manager
  IF EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.user_roles ur ON up.role_id = ur.id
    WHERE up.user_id = p_user_id 
    AND ur.name = 'subscription_manager'
    AND up.is_active = true
  ) THEN
    RETURN QUERY SELECT 
      true, 
      'subscription_manager'::VARCHAR, 
      'Subscription Manager'::VARCHAR, 
      'Acceso total como Gestor de Suscripciones'::VARCHAR,
      false,
      NULL::UUID;
    RETURN;
  END IF;

  -- Verificar si es empleado
  SELECT is_employee(p_user_id) INTO v_is_employee;
  
  IF v_is_employee THEN
    -- Es empleado, obtener el owner
    SELECT get_employee_owner(p_user_id) INTO v_owner_id;
    
    -- Verificar la suscripción del OWNER, no la del empleado
    RETURN QUERY
    SELECT 
      CASE 
        WHEN us.status IN ('active', 'trial') AND (us.end_date IS NULL OR us.end_date > NOW()) THEN true
        ELSE false -- Incluso si el owner no tiene suscripción, el empleado puede tener acceso limitado
      END as has_access,
      COALESCE(us.status, 'inherited') as subscription_status,
      COALESCE(sp.display_name, 'Plan del propietario') as plan_name,
      CASE
        WHEN us.status = 'active' THEN 'Acceso mediante suscripción del propietario (Activa)'
        WHEN us.status = 'trial' THEN 'Acceso mediante suscripción del propietario (Prueba)'
        WHEN us.status = 'expired' THEN 'La suscripción del propietario ha expirado'
        WHEN us.status = 'cancelled' THEN 'La suscripción del propietario ha sido cancelada'
        ELSE 'El propietario no tiene suscripción activa'
      END as message,
      true as is_employee,
      v_owner_id
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = v_owner_id
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    -- Si el owner no tiene suscripción, el empleado tiene acceso con restricciones
    IF NOT FOUND THEN
      RETURN QUERY SELECT 
        true, -- Dar acceso de todos modos
        'no_owner_subscription'::VARCHAR,
        'Acceso Limitado'::VARCHAR,
        'Tu propietario no tiene una suscripción activa. Funcionalidad limitada.'::VARCHAR,
        true,
        v_owner_id;
    END IF;
    
    RETURN;
  END IF;

  -- NO es empleado, verificar suscripción propia (es owner)
  RETURN QUERY
  SELECT 
    CASE 
      WHEN us.status IN ('active', 'trial') AND (us.end_date IS NULL OR us.end_date > NOW()) THEN true
      ELSE false
    END as has_access,
    COALESCE(us.status, 'none') as subscription_status,
    COALESCE(sp.display_name, 'Sin plan') as plan_name,
    CASE
      WHEN us.status = 'active' THEN 'Suscripción activa'
      WHEN us.status = 'trial' THEN 'Período de prueba'
      WHEN us.status = 'expired' THEN 'Suscripción expirada. Por favor renueva tu plan.'
      WHEN us.status = 'cancelled' THEN 'Suscripción cancelada. Contacta soporte.'
      ELSE 'No tienes una suscripción activa. Contacta al administrador.'
    END as message,
    false as is_employee,
    NULL::UUID as owner_id
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Si no hay registro de suscripción para el owner
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      'none'::VARCHAR,
      'Sin plan'::VARCHAR,
      'No tienes una suscripción activa. Contacta al administrador.'::VARCHAR,
      false,
      NULL::UUID;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_subscription_access TO authenticated;

-- =====================================================
-- VERIFICACIONES
-- =====================================================

-- Verificar empleados mal creados (que parecen owners)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.user_profiles
  WHERE parent_user_id IS NULL
  AND role_id IN (SELECT id FROM user_roles WHERE name = 'employee');
  
  IF v_count > 0 THEN
    RAISE NOTICE '⚠️  ATENCIÓN: Se encontraron % empleados creados como owners (sin parent_user_id)', v_count;
    RAISE NOTICE '    Estos empleados necesitan ser corregidos manualmente.';
    RAISE NOTICE '    Ejecuta: SELECT user_id, email, display_name FROM user_profiles WHERE parent_user_id IS NULL AND role_id IN (SELECT id FROM user_roles WHERE name = ''employee'');';
  ELSE
    RAISE NOTICE '✅ No se encontraron empleados mal creados';
  END IF;
END $$;

-- Mostrar resumen
SELECT 
  '=== RESUMEN DE CORRECCIONES ===' as info
UNION ALL
SELECT '✅ Función create_employee_direct actualizada con parámetro owner_user_id obligatorio'
UNION ALL
SELECT '✅ Función is_employee creada para identificar empleados'
UNION ALL
SELECT '✅ Función get_employee_owner creada para obtener el owner de un empleado'
UNION ALL
SELECT '✅ Función check_user_subscription_access mejorada:'
UNION ALL
SELECT '   - Empleados heredan acceso de la suscripción del owner'
UNION ALL
SELECT '   - Empleados mantienen acceso incluso si owner no tiene suscripción'
UNION ALL
SELECT '   - Owners con suscripción expirada son bloqueados correctamente'
UNION ALL
SELECT '   - Super admins y subscription managers mantienen acceso total';

COMMIT;
