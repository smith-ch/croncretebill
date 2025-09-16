-- Script para arreglar problemas con el registro de empleados
-- Este script mejora el trigger para evitar errores durante el registro

-- Primero, eliminamos el trigger problemático
DROP TRIGGER IF EXISTS process_employee_invitation_trigger ON auth.users;

-- Crear una versión mejorada del trigger que sea más robusta
CREATE OR REPLACE FUNCTION process_employee_invitation_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Solo procesar si el email no es nulo
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar invitación pendiente para este email
  SELECT * INTO invitation_record
  FROM public.pending_employee_invitations
  WHERE email = NEW.email
  AND NOT used
  AND expires_at > NOW()
  LIMIT 1;

  -- Si existe invitación, crear el perfil de empleado
  IF FOUND THEN
    BEGIN
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
    EXCEPTION
      WHEN OTHERS THEN
        -- Si hay error, loggearlo pero no fallar el registro
        RAISE WARNING 'Error processing employee invitation for %: %', NEW.email, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Recrear el trigger con la nueva función
CREATE TRIGGER process_employee_invitation_trigger_safe
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION process_employee_invitation_safe();

-- Agregar políticas RLS más específicas para pending_employee_invitations
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.pending_employee_invitations;
DROP POLICY IF EXISTS "Users can insert their own invitations" ON public.pending_employee_invitations;

-- Política para ver invitaciones (solo las que yo he creado)
CREATE POLICY "View own invitations" ON public.pending_employee_invitations
    FOR SELECT 
    USING (invited_by = auth.uid());

-- Política para insertar invitaciones
CREATE POLICY "Insert own invitations" ON public.pending_employee_invitations
    FOR INSERT 
    WITH CHECK (invited_by = auth.uid());

-- Política para actualizar invitaciones (marcar como usadas)
CREATE POLICY "Update own invitations" ON public.pending_employee_invitations
    FOR UPDATE 
    USING (invited_by = auth.uid());

-- Agregar una política para permitir que cualquier usuario vea invitaciones por email
-- (necesario para que la página de signup-invite funcione)
CREATE POLICY "View invitations by email" ON public.pending_employee_invitations
    FOR SELECT 
    USING (true); -- Permitir lectura pública para verificar invitaciones

-- Mejorar la función de permisos para manejar errores
CREATE OR REPLACE FUNCTION get_user_permissions_simple(user_uuid UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  result JSON;
BEGIN
  -- Si no hay usuario autenticado, devolver permisos mínimos
  IF user_uuid IS NULL THEN
    RETURN json_build_object(
      'canCreateInvoices', false,
      'canViewFinances', false,
      'canManageInventory', false,
      'canManageClients', false,
      'canManageEmployees', false,
      'maxInvoiceAmount', null,
      'role', 'anonymous',
      'isOwner', false,
      'display_name', 'Usuario no autenticado'
    );
  END IF;

  -- Buscar perfil del usuario
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      -- En caso de error, asumir que es owner
      user_profile := NULL;
  END;

  IF FOUND THEN
    -- Es un empleado
    result := json_build_object(
      'canCreateInvoices', COALESCE(user_profile.can_create_invoices, false),
      'canViewFinances', COALESCE(user_profile.can_view_finances, false),
      'canManageInventory', COALESCE(user_profile.can_manage_inventory, false),
      'canManageClients', COALESCE(user_profile.can_manage_clients, false),
      'canManageEmployees', false,
      'maxInvoiceAmount', user_profile.max_invoice_amount,
      'role', COALESCE(user_profile.role_name, 'employee'),
      'isOwner', false,
      'display_name', COALESCE(user_profile.display_name, 'Empleado')
    );
  ELSE
    -- Es el propietario o usuario sin perfil
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

-- Función para procesar invitaciones manualmente después del registro
CREATE OR REPLACE FUNCTION process_invitation_manually(
  user_email TEXT,
  user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  result JSON;
BEGIN
  -- Buscar invitación pendiente para este email
  SELECT * INTO invitation_record
  FROM public.pending_employee_invitations
  WHERE email = user_email
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
      user_id,
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

    result := json_build_object(
      'success', true,
      'message', 'Perfil de empleado creado exitosamente'
    );
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'No se encontró invitación válida'
    );
  END IF;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;