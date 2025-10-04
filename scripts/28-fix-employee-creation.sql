-- Función para crear empleados desde el lado del servidor
-- Esta función permite al owner crear empleados sin necesidad de service role key

CREATE OR REPLACE FUNCTION create_employee_user(
  employee_email TEXT,
  employee_password TEXT,
  employee_display_name TEXT,
  employee_role_id UUID,
  employee_department TEXT DEFAULT NULL,
  employee_job_position TEXT DEFAULT NULL,
  employee_can_create_invoices BOOLEAN DEFAULT false,
  employee_can_view_finances BOOLEAN DEFAULT false,
  employee_can_manage_inventory BOOLEAN DEFAULT false,
  employee_can_manage_clients BOOLEAN DEFAULT false,
  employee_max_invoice_amount DECIMAL DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del propietario de la función
AS $$
DECLARE
  new_user_id UUID;
  current_user_id UUID;
  result JSON;
BEGIN
  -- Obtener el usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que el usuario actual es un owner (no tiene parent_user_id)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = current_user_id 
    AND parent_user_id IS NULL
  ) AND current_user_id NOT IN (
    -- También permitir si es el primer usuario (owner original)
    SELECT DISTINCT parent_user_id FROM public.user_profiles WHERE parent_user_id IS NOT NULL
    UNION
    SELECT auth.uid() WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles)
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para crear empleados';
  END IF;

  -- Insertar el nuevo usuario usando la función interna de Supabase
  -- Nota: Esto requiere que tengas habilitado el registro público temporalmente
  -- o usar una función de edge que maneje la creación del usuario
  
  -- Por ahora, vamos a crear un registro temporal que el usuario pueda completar
  INSERT INTO public.pending_employee_invitations (
    id,
    email,
    display_name,
    role_id,
    department,
    job_position,
    can_create_invoices,
    can_view_finances,
    can_manage_inventory,
    can_manage_clients,
    max_invoice_amount,
    invited_by,
    created_at,
    expires_at
  ) VALUES (
    gen_random_uuid(),
    employee_email,
    employee_display_name,
    employee_role_id,
    employee_department,
    employee_job_position,
    employee_can_create_invoices,
    employee_can_view_finances,
    employee_can_manage_inventory,
    employee_can_manage_clients,
    employee_max_invoice_amount,
    current_user_id,
    NOW(),
    NOW() + INTERVAL '7 days'
  ) RETURNING id INTO new_user_id;

  result := json_build_object(
    'success', true,
    'invitation_id', new_user_id,
    'message', 'Invitación creada. El empleado deberá registrarse usando el enlace de invitación.'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Crear tabla para invitaciones pendientes
CREATE TABLE IF NOT EXISTS public.pending_employee_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role_id UUID REFERENCES public.user_roles(id),
    department VARCHAR(100),
    job_position VARCHAR(100),
    can_create_invoices BOOLEAN DEFAULT false,
    can_view_finances BOOLEAN DEFAULT false,
    can_manage_inventory BOOLEAN DEFAULT false,
    can_manage_clients BOOLEAN DEFAULT false,
    max_invoice_amount DECIMAL(10,2),
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false
);

-- RLS para invitaciones
ALTER TABLE public.pending_employee_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invitations" ON public.pending_employee_invitations
    FOR SELECT USING (invited_by = auth.uid());

CREATE POLICY "Users can insert their own invitations" ON public.pending_employee_invitations
    FOR INSERT WITH CHECK (invited_by = auth.uid());

-- Función para procesar invitación cuando el empleado se registra
CREATE OR REPLACE FUNCTION process_employee_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Buscar invitación pendiente para este email
  SELECT * INTO invitation_record
  FROM public.pending_employee_invitations
  WHERE email = NEW.email
  AND NOT used
  AND expires_at > NOW()
  LIMIT 1;

  -- Si existe invitación, crear el perfil de empleado
  IF FOUND THEN
    INSERT INTO public.user_profiles (
      user_id,
      parent_user_id,
      role_id,
      display_name,
      department,
      job_position,
      can_create_invoices,
      can_view_finances,
      can_manage_inventory,
      can_manage_clients,
      max_invoice_amount,
      allowed_modules,
      is_active
    ) VALUES (
      NEW.id,
      invitation_record.invited_by,
      invitation_record.role_id,
      invitation_record.display_name,
      invitation_record.department,
      invitation_record.job_position,
      invitation_record.can_create_invoices,
      invitation_record.can_view_finances,
      invitation_record.can_manage_inventory,
      invitation_record.can_manage_clients,
      invitation_record.max_invoice_amount,
      '["invoices", "clients", "products"]'::jsonb,
      true
    );

    -- Marcar invitación como usada
    UPDATE public.pending_employee_invitations
    SET used = true
    WHERE id = invitation_record.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para procesar invitaciones automáticamente
DROP TRIGGER IF EXISTS process_employee_invitation_trigger ON auth.users;
CREATE TRIGGER process_employee_invitation_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION process_employee_invitation();

-- Función simplificada para obtener permisos sin problemas de RLS
CREATE OR REPLACE FUNCTION get_user_permissions_simple(user_uuid UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  result JSON;
BEGIN
  -- Buscar perfil del usuario
  SELECT 
    up.*,
    ur.name as role_name,
    ur.display_name as role_display_name,
    ur.permissions as role_permissions
  INTO user_profile
  FROM public.user_profiles up
  LEFT JOIN public.user_roles ur ON up.role_id = ur.id
  WHERE up.user_id = user_uuid
  AND up.is_active = true;

  IF FOUND THEN
    -- Es un empleado
    result := json_build_object(
      'canCreateInvoices', user_profile.can_create_invoices,
      'canViewFinances', user_profile.can_view_finances,
      'canManageInventory', user_profile.can_manage_inventory,
      'canManageClients', user_profile.can_manage_clients,
      'canManageEmployees', false,
      'maxInvoiceAmount', user_profile.max_invoice_amount,
      'role', user_profile.role_name,
      'isOwner', false,
      'display_name', user_profile.display_name
    );
  ELSE
    -- Es el propietario
    result := json_build_object(
      'canCreateInvoices', true,
      'canViewFinances', true,
      'canManageInventory', true,
      'canManageClients', true,
      'canManageEmployees', true,
      'maxInvoiceAmount', null,
      'role', 'owner',
      'isOwner', true,
      'display_name', 'Propietario'
    );
  END IF;

  RETURN result;
END;
$$;