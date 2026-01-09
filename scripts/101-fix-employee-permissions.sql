-- Script para corregir el sistema de permisos de empleados vs owners
-- El problema: empleados tienen permisos de owner cuando no deberían

-- ========================================
-- PASO 1: Verificar estado actual
-- ========================================

-- Ver todos los usuarios y si son owners o empleados
SELECT 
  user_id,
  parent_user_id,
  display_name,
  CASE 
    WHEN parent_user_id IS NULL THEN '👑 OWNER'
    ELSE '👨‍💼 EMPLEADO'
  END as tipo,
  can_create_invoices,
  can_view_finances,
  can_manage_inventory,
  can_manage_clients,
  is_active
FROM user_profiles
ORDER BY parent_user_id NULLS FIRST;

-- ========================================
-- PASO 2: Recrear función RPC con lógica correcta
-- ========================================

-- Esta función debe devolver isOwner: false para empleados (parent_user_id IS NOT NULL)
-- y isOwner: true para owners (parent_user_id IS NULL)
CREATE OR REPLACE FUNCTION get_user_permissions_simple(user_uuid UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  result JSON;
  is_employee BOOLEAN;
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
      ur.permissions as role_permissions,
      -- CRÍTICO: Si tiene parent_user_id, ES EMPLEADO, no owner
      (up.parent_user_id IS NOT NULL) as is_employee_flag
    INTO user_profile
    FROM public.user_profiles up
    LEFT JOIN public.user_roles ur ON up.role_id = ur.id
    WHERE up.user_id = user_uuid
    AND up.is_active = true;
  EXCEPTION
    WHEN OTHERS THEN
      -- En caso de error, verificar si existe el perfil sin activo
      SELECT 
        up.*,
        ur.name as role_name,
        ur.display_name as role_display_name,
        ur.permissions as role_permissions,
        (up.parent_user_id IS NOT NULL) as is_employee_flag
      INTO user_profile
      FROM public.user_profiles up
      LEFT JOIN public.user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = user_uuid;
      
      -- Si tampoco se encontró, asumir que es owner sin perfil
      IF NOT FOUND THEN
        user_profile := NULL;
      END IF;
  END;

  -- Si encontró perfil
  IF user_profile.user_id IS NOT NULL THEN
    is_employee := (user_profile.parent_user_id IS NOT NULL);
    
    -- Si es empleado (parent_user_id IS NOT NULL)
    IF is_employee THEN
      result := json_build_object(
        'canCreateInvoices', COALESCE(user_profile.can_create_invoices, false),
        'canViewFinances', COALESCE(user_profile.can_view_finances, false),
        'canManageInventory', COALESCE(user_profile.can_manage_inventory, false),
        'canManageClients', COALESCE(user_profile.can_manage_clients, false),
        'canManageEmployees', false, -- Empleados NUNCA pueden gestionar empleados
        'maxInvoiceAmount', user_profile.max_invoice_amount,
        'role', COALESCE(user_profile.role_name, 'employee'),
        'isOwner', false, -- CRÍTICO: FALSE para empleados
        'display_name', COALESCE(user_profile.display_name, 'Empleado'),
        'userId', user_profile.user_id,
        'parentUserId', user_profile.parent_user_id
      );
    ELSE
      -- Es owner (parent_user_id IS NULL)
      result := json_build_object(
        'canCreateInvoices', true,
        'canViewFinances', true,
        'canManageInventory', true,
        'canManageClients', true,
        'canManageEmployees', true,
        'maxInvoiceAmount', null, -- Sin límite para owners
        'role', 'owner',
        'isOwner', true, -- CRÍTICO: TRUE para owners
        'display_name', COALESCE(user_profile.display_name, 'Propietario'),
        'userId', user_profile.user_id,
        'parentUserId', null
      );
    END IF;
  ELSE
    -- No hay perfil: es un owner nuevo sin perfil todavía
    result := json_build_object(
      'canCreateInvoices', true,
      'canViewFinances', true,
      'canManageInventory', true,
      'canManageClients', true,
      'canManageEmployees', true,
      'maxInvoiceAmount', null,
      'role', 'owner',
      'isOwner', true,
      'display_name', 'Propietario',
      'userId', user_uuid,
      'parentUserId', null
    );
  END IF;

  RETURN result;
END;
$$;

-- ========================================
-- PASO 3: Asegurar que empleados tienen restricciones correctas
-- ========================================

-- Actualizar empleados para que NO tengan permisos de finanzas
UPDATE user_profiles
SET 
  can_view_finances = false,
  can_manage_users = false,
  updated_at = NOW()
WHERE parent_user_id IS NOT NULL; -- Solo empleados

-- ========================================
-- PASO 4: Verificar resultados
-- ========================================

-- Probar la función para cada usuario
DO $$
DECLARE
  user_rec RECORD;
  permissions_result JSON;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRUEBA DE PERMISOS POR USUARIO';
  RAISE NOTICE '========================================';
  
  FOR user_rec IN 
    SELECT user_id, display_name, parent_user_id 
    FROM user_profiles 
    ORDER BY parent_user_id NULLS FIRST
  LOOP
    permissions_result := get_user_permissions_simple(user_rec.user_id);
    
    RAISE NOTICE '';
    RAISE NOTICE 'Usuario: % (parent: %)', user_rec.display_name, 
      CASE WHEN user_rec.parent_user_id IS NULL THEN 'NINGUNO (ES OWNER)' 
           ELSE user_rec.parent_user_id::TEXT END;
    RAISE NOTICE 'isOwner: %', permissions_result->>'isOwner';
    RAISE NOTICE 'role: %', permissions_result->>'role';
    RAISE NOTICE 'canViewFinances: %', permissions_result->>'canViewFinances';
    RAISE NOTICE 'canManageEmployees: %', permissions_result->>'canManageEmployees';
  END LOOP;
END $$;

-- ========================================
-- PASO 5: Mensaje final
-- ========================================

SELECT 
  '✅ Script completado' as status,
  'Revisa los mensajes arriba para verificar que:' as instrucciones,
  '1. Owners tienen isOwner: true' as check_1,
  '2. Empleados tienen isOwner: false' as check_2,
  '3. Empleados NO pueden ver finanzas' as check_3;
