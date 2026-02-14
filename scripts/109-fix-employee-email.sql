-- =====================================================
-- Script 109: Fix Employee Email Not Showing
-- =====================================================

BEGIN;

-- Recrear la función con el campo email incluido
CREATE OR REPLACE FUNCTION create_employee_direct(
  employee_email TEXT,
  employee_password TEXT,
  employee_display_name TEXT,
  owner_user_id UUID,
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
  -- Si no se proporciona owner_user_id, usar auth.uid()
  IF owner_user_id IS NULL THEN
    actual_owner_id := auth.uid();
  ELSE
    actual_owner_id := owner_user_id;
  END IF;

  -- Verificar que el owner existe y es realmente un owner
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
      'error', 'No tienes permisos para crear empleados'
    );
  END IF;

  -- Obtener el ID del rol de empleado
  SELECT id INTO employee_role_id
  FROM public.user_roles
  WHERE name = 'employee'
  LIMIT 1;

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
      NOW(),
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

  -- Crear el perfil del empleado con EMAIL incluido
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      parent_user_id,
      root_owner_id,
      role_id,
      email,                -- ✅ AGREGAR CAMPO EMAIL
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
      actual_owner_id,
      actual_owner_id,
      employee_role_id,
      employee_email,       -- ✅ GUARDAR EMAIL
      employee_display_name,
      employee_department,
      employee_job_position,
      employee_can_create_invoices,
      employee_can_view_finances,
      employee_can_manage_inventory,
      employee_can_manage_clients,
      false,
      true,
      '["invoices", "clients", "products", "inventory"]'::jsonb
    );

    RAISE NOTICE 'Empleado creado: % (%) para owner: %', 
      employee_display_name, employee_email, actual_owner_id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Si falla, eliminar el usuario creado
      DELETE FROM auth.users WHERE id = new_user_id;
      RETURN json_build_object(
        'success', false,
        'error', 'Error al crear el perfil: ' || SQLERRM
      );
  END;

  -- Retornar éxito
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', employee_email,
    'display_name', employee_display_name,
    'owner_id', actual_owner_id,
    'message', 'Empleado creado exitosamente'
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

-- Permisos
GRANT EXECUTE ON FUNCTION create_employee_direct TO authenticated;

-- =====================================================
-- ACTUALIZAR EMPLEADOS EXISTENTES SIN EMAIL
-- =====================================================

-- Actualizar empleados que no tienen email en user_profiles
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.user_id = au.id
AND up.parent_user_id IS NOT NULL  -- Solo empleados
AND (up.email IS NULL OR up.email = '');

-- Verificación
DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated
  FROM user_profiles
  WHERE parent_user_id IS NOT NULL
  AND email IS NOT NULL
  AND email != '';

  RAISE NOTICE '=== CORRECCIÓN COMPLETADA ===';
  RAISE NOTICE '✅ Función create_employee_direct actualizada con campo email';
  RAISE NOTICE '✅ Empleados con email: %', v_updated;
END $$;

COMMIT;
