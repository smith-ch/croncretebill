-- Función para crear empleados directamente (sin invitación)
-- El owner crea el usuario con email y contraseña inmediatamente

-- Enable pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_employee_direct(
  employee_email TEXT,
  employee_password TEXT,
  employee_display_name TEXT,
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
  current_user_id UUID;
  result JSON;
  employee_role_id UUID;
BEGIN
  -- Obtener el usuario actual (owner)
  current_user_id := auth.uid();
  
  -- Verificar que el usuario actual es un owner
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = current_user_id 
    AND parent_user_id IS NULL
    AND is_active = true
  ) AND NOT EXISTS (
    -- Permitir si es el primer usuario
    SELECT 1 FROM auth.users WHERE id = current_user_id
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

  -- Crear el usuario en auth.users usando la extensión
  -- Nota: Requiere que la función sea SECURITY DEFINER
  BEGIN
    -- Intentar crear el usuario
    new_user_id := extensions.uuid_generate_v4();
    
    -- Insertar en auth.users (requiere privilegios elevados)
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
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      parent_user_id,
      root_owner_id,
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
      current_user_id,
      current_user_id,
      employee_role_id,
      employee_display_name,
      employee_department,
      employee_job_position,
      employee_can_create_invoices,
      employee_can_view_finances,
      employee_can_manage_inventory,
      employee_can_manage_clients,
      false, -- Los empleados no pueden gestionar usuarios
      true,
      '["invoices", "clients", "products", "inventory"]'::jsonb
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Si falla la creación del perfil, intentar eliminar el usuario creado
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
COMMENT ON FUNCTION create_employee_direct IS 'Crea un empleado directamente con email y contraseña, sin necesidad de invitación. Solo los owners pueden ejecutar esta función.';
