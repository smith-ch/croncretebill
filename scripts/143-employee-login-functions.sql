-- ============================================================================
-- Script 143: Función para verificar contraseña de empleado
-- ============================================================================
-- Función auxiliar para la API de employee-login
-- Verifica la contraseña sin usar el endpoint de auth que está fallando
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_employee_password(
  user_email TEXT,
  user_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encrypted_password TEXT;
  v_user_id UUID;
  v_is_employee BOOLEAN;
BEGIN
  -- 1. Obtener el encrypted_password del usuario
  SELECT au.encrypted_password, au.id 
  INTO v_encrypted_password, v_user_id
  FROM auth.users au
  WHERE au.email = user_email;
  
  IF v_encrypted_password IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 2. Verificar que sea empleado (tiene parent_user_id)
  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = v_user_id 
    AND parent_user_id IS NOT NULL
  ) INTO v_is_employee;
  
  IF NOT v_is_employee THEN
    RETURN FALSE;
  END IF;
  
  -- 3. Verificar la contraseña usando crypt
  -- La contraseña encriptada ya incluye el salt, por eso usamos la misma para comparar
  RETURN v_encrypted_password = extensions.crypt(user_password, v_encrypted_password);
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar FALSE
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_employee_password TO service_role;

COMMENT ON FUNCTION verify_employee_password IS 
  'Verifica la contraseña de un empleado sin usar el endpoint de auth. Solo para service_role.';


-- ============================================================================
-- Función para obtener datos completos del empleado después del login
-- ============================================================================

CREATE OR REPLACE FUNCTION get_employee_data(employee_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', up.user_id,
    'email', up.email,
    'display_name', up.display_name,
    'parent_user_id', up.parent_user_id,
    'root_owner_id', up.root_owner_id,
    'role', ur.name,
    'is_active', up.is_active,
    'can_create_invoices', up.can_create_invoices,
    'can_view_finances', up.can_view_finances,
    'can_manage_inventory', up.can_manage_inventory,
    'can_manage_clients', up.can_manage_clients,
    'can_manage_users', up.can_manage_users,
    'allowed_modules', up.allowed_modules,
    'department', up.department,
    'job_position', up.job_position,
    'parent_user', json_build_object(
      'id', parent.user_id,
      'email', parent.email,
      'display_name', parent.display_name
    )
  ) INTO v_result
  FROM public.user_profiles up
  LEFT JOIN public.user_roles ur ON ur.id = up.role_id
  LEFT JOIN public.user_profiles parent ON parent.user_id = up.parent_user_id
  WHERE up.user_id = employee_user_id
  AND up.parent_user_id IS NOT NULL;  -- Solo empleados
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_employee_data TO authenticated, service_role;

COMMENT ON FUNCTION get_employee_data IS 
  'Obtiene los datos completos de un empleado incluyendo permisos y datos del owner';
