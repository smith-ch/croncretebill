-- ============================================================================
-- Script 140: Corregir create_employee_direct para nuevos empleados
-- ============================================================================
-- Usar instance_id del owner y NULL en tokens (evita 500 en login futuro)
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
  v_instance_id UUID;  -- Instance ID correcto del proyecto
BEGIN
  IF owner_user_id IS NULL THEN
    actual_owner_id := auth.uid();
  ELSE
    actual_owner_id := owner_user_id;
  END IF;

  -- Obtener instance_id del owner (o de cualquier usuario existente)
  SELECT instance_id INTO v_instance_id 
  FROM auth.users 
  WHERE id = actual_owner_id 
  LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = actual_owner_id 
    AND parent_user_id IS NULL
    AND is_active = true
  ) AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = actual_owner_id)
  AND EXISTS (SELECT 1 FROM public.user_profiles) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No tienes permisos para crear empleados. Solo los propietarios pueden crear empleados.'
    );
  END IF;

  SELECT id INTO employee_role_id FROM public.user_roles WHERE name = 'employee' LIMIT 1;

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
      COALESCE(v_instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
      employee_email,
      extensions.crypt(employee_password, extensions.gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', employee_display_name),
      false,
      'authenticated',
      'authenticated',
      NULL,   -- confirmation_token: NULL en lugar de ''
      NULL    -- recovery_token: NULL en lugar de ''
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN json_build_object('success', false, 'error', 'Ya existe un usuario con este email');
    WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'error', 'Error al crear el usuario: ' || SQLERRM);
  END;

  -- Crear perfil del empleado (igual que script 104)
  BEGIN
    INSERT INTO public.user_profiles (
      user_id, parent_user_id, root_owner_id, role_id, email, display_name,
      department, job_position, can_create_invoices, can_view_finances,
      can_manage_inventory, can_manage_clients, can_manage_users, is_active, allowed_modules
    )
    VALUES (
      new_user_id, actual_owner_id, actual_owner_id, employee_role_id, employee_email, employee_display_name,
      employee_department, employee_job_position, employee_can_create_invoices, employee_can_view_finances,
      employee_can_manage_inventory, employee_can_manage_clients, false, true,
      '["invoices", "clients", "products", "inventory"]'::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      DELETE FROM auth.users WHERE id = new_user_id;
      RETURN json_build_object('success', false, 'error', 'Error al crear perfil: ' || SQLERRM);
  END;

  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', employee_email,
    'display_name', employee_display_name,
    'owner_id', actual_owner_id,
    'message', 'Empleado creado exitosamente'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Error inesperado: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION create_employee_direct TO authenticated;
