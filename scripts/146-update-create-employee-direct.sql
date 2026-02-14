-- ============================================================================
-- Script 146: Actualizar create_employee_direct (Versión Final)
-- ============================================================================
-- Asegura que los empleados se creen correctamente en auth.users
-- ============================================================================

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
  v_instance_id UUID;
BEGIN
  -- Determinar el owner ID
  IF owner_user_id IS NULL THEN
    actual_owner_id := auth.uid();
  ELSE
    actual_owner_id := owner_user_id;
  END IF;

  -- Obtener instance_id del proyecto
  SELECT instance_id INTO v_instance_id 
  FROM auth.users 
  WHERE id = actual_owner_id 
  LIMIT 1;
  
  -- Fallback: usar instance_id de cualquier usuario
  IF v_instance_id IS NULL THEN
    SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
  END IF;

  -- Verificar que el owner existe
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = actual_owner_id 
    AND parent_user_id IS NULL
    AND is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No tienes permisos para crear empleados. Solo los propietarios pueden crear empleados.'
    );
  END IF;

  -- Obtener el role_id de employee
  SELECT id INTO employee_role_id 
  FROM public.user_roles 
  WHERE name = 'employee' 
  LIMIT 1;

  -- Generar nuevo UUID
  new_user_id := extensions.uuid_generate_v4();
  
  -- Crear usuario en auth.users
  BEGIN
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
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      new_user_id,
      COALESCE(v_instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
      LOWER(TRIM(employee_email)),
      extensions.crypt(employee_password, extensions.gen_salt('bf')),
      NOW(), -- Email confirmado inmediatamente
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', employee_display_name),
      false,
      'authenticated',
      'authenticated',
      NULL, -- confirmation_token en NULL
      NULL, -- recovery_token en NULL
      NULL, -- email_change_token_new en NULL
      ''    -- email_change en string vacío
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
        'error', 'Error al crear el usuario en auth: ' || SQLERRM
      );
  END;

  -- Crear perfil del empleado
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      parent_user_id,
      root_owner_id,
      role_id,
      email,
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
    )
    VALUES (
      new_user_id,
      actual_owner_id,
      actual_owner_id,
      employee_role_id,
      LOWER(TRIM(employee_email)),
      employee_display_name,
      employee_department,
      employee_job_position,
      employee_can_create_invoices,
      employee_can_view_finances,
      employee_can_manage_inventory,
      employee_can_manage_clients,
      false, -- can_manage_users siempre false para empleados
      true,  -- is_active por defecto
      '["invoices", "clients", "products", "inventory"]'::jsonb
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Si falla el perfil, eliminar el usuario de auth
      DELETE FROM auth.users WHERE id = new_user_id;
      RETURN json_build_object(
        'success', false, 
        'error', 'Error al crear perfil: ' || SQLERRM
      );
  END;

  -- Retornar éxito
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', LOWER(TRIM(employee_email)),
    'display_name', employee_display_name,
    'owner_id', actual_owner_id,
    'message', 'Empleado creado exitosamente. Puede iniciar sesión inmediatamente.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Error inesperado: ' || SQLERRM
    );
END;
$$;

-- Asegurar permisos
GRANT EXECUTE ON FUNCTION create_employee_direct TO authenticated;

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Función create_employee_direct actualizada correctamente';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Los nuevos empleados se crearán correctamente en auth.users';
  RAISE NOTICE 'y podrán hacer login sin error 500.';
  RAISE NOTICE '';
END $$;
