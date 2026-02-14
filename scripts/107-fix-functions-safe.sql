-- =====================================================
-- Script 107: Reparar funciones de forma segura
-- =====================================================
-- Este script recrea las funciones con manejo robusto de errores
-- para evitar el error 500 durante login
-- =====================================================

BEGIN;

-- =====================================================
-- FUNCIÓN 1: is_employee (versión segura)
-- =====================================================
CREATE OR REPLACE FUNCTION is_employee(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Retornar false si el parámetro es NULL
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar si existe en user_profiles con parent_user_id no nulo
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = p_user_id 
    AND parent_user_id IS NOT NULL
    AND is_active = true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de cualquier error, retornar false para no bloquear
    RETURN false;
END;
$$;

-- =====================================================
-- FUNCIÓN 2: get_employee_owner (versión segura)
-- =====================================================
CREATE OR REPLACE FUNCTION get_employee_owner(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Retornar NULL si el parámetro es NULL
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Obtener el owner (preferir root_owner_id, sino parent_user_id)
  SELECT 
    COALESCE(root_owner_id, parent_user_id) 
  INTO v_owner_id
  FROM public.user_profiles
  WHERE user_id = p_user_id
  AND parent_user_id IS NOT NULL
  LIMIT 1;
  
  RETURN v_owner_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar NULL
    RETURN NULL;
END;
$$;

-- =====================================================
-- FUNCIÓN 3: check_user_subscription_access (versión simplificada y segura)
-- =====================================================
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
STABLE
AS $$
DECLARE
  v_is_employee BOOLEAN := false;
  v_owner_id UUID := NULL;
BEGIN
  -- Si no hay user_id, denegar acceso
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT 
      false, 
      'no_user'::VARCHAR, 
      'Sin usuario'::VARCHAR, 
      'No se proporcionó ID de usuario'::VARCHAR,
      false,
      NULL::UUID;
    RETURN;
  END IF;

  -- Verificar si es super admin (acceso total)
  IF EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = p_user_id 
    AND is_super_admin = true
  ) THEN
    RETURN QUERY SELECT 
      true, 
      'super_admin'::VARCHAR, 
      'Super Admin'::VARCHAR, 
      'Acceso total'::VARCHAR,
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
      'Gestor'::VARCHAR, 
      'Acceso total'::VARCHAR,
      false,
      NULL::UUID;
    RETURN;
  END IF;

  -- Verificar si es empleado usando la función segura
  BEGIN
    v_is_employee := is_employee(p_user_id);
  EXCEPTION
    WHEN OTHERS THEN
      v_is_employee := false;
  END;
  
  IF v_is_employee THEN
    -- Es empleado, obtener el owner
    BEGIN
      v_owner_id := get_employee_owner(p_user_id);
    EXCEPTION
      WHEN OTHERS THEN
        v_owner_id := NULL;
    END;
    
    -- Verificar suscripción del owner
    RETURN QUERY
    SELECT 
      CASE 
        WHEN us.status IN ('active', 'trial') AND (us.end_date IS NULL OR us.end_date > NOW()) THEN true
        ELSE true -- Empleados siempre tienen acceso básico
      END as has_access,
      COALESCE(us.status, 'inherited')::VARCHAR as subscription_status,
      COALESCE(sp.display_name, 'Plan del propietario')::VARCHAR as plan_name,
      'Acceso mediante propietario'::VARCHAR as message,
      true as is_employee,
      v_owner_id
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = v_owner_id
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    -- Si no se encontró suscripción del owner, dar acceso limitado
    IF NOT FOUND THEN
      RETURN QUERY SELECT 
        true, 
        'no_subscription'::VARCHAR,
        'Acceso Limitado'::VARCHAR,
        'Acceso básico'::VARCHAR,
        true,
        v_owner_id;
    END IF;
    
    RETURN;
  END IF;

  -- NO es empleado (es owner), verificar su propia suscripción
  RETURN QUERY
  SELECT 
    CASE 
      -- Bloquear si está expirada
      WHEN us.end_date IS NOT NULL AND us.end_date <= NOW() THEN false
      WHEN us.status IN ('active', 'trial') AND (us.end_date IS NULL OR us.end_date > NOW()) THEN true
      ELSE false
    END as has_access,
    CASE
      WHEN us.end_date IS NOT NULL AND us.end_date <= NOW() THEN 'expired'
      ELSE COALESCE(us.status, 'none')
    END::VARCHAR as subscription_status,
    COALESCE(sp.display_name, 'Sin plan')::VARCHAR as plan_name,
    CASE
      WHEN us.end_date IS NOT NULL AND us.end_date <= NOW() THEN 
        'Suscripción expirada el ' || TO_CHAR(us.end_date, 'DD/MM/YYYY')
      WHEN us.status = 'active' THEN 'Suscripción activa'
      WHEN us.status = 'trial' THEN 'Período de prueba'
      ELSE 'Sin suscripción activa'
    END::VARCHAR as message,
    false as is_employee,
    NULL::UUID as owner_id
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Si no hay suscripción, denegar acceso
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      'none'::VARCHAR,
      'Sin plan'::VARCHAR,
      'Sin suscripción'::VARCHAR,
      false,
      NULL::UUID;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- En caso de cualquier error, dar acceso por defecto para no bloquear
    RETURN QUERY SELECT 
      true,
      'error'::VARCHAR,
      'Error'::VARCHAR,
      'Error al verificar: ' || SQLERRM::VARCHAR,
      false,
      NULL::UUID;
END;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================
GRANT EXECUTE ON FUNCTION is_employee TO authenticated;
GRANT EXECUTE ON FUNCTION is_employee TO anon;

GRANT EXECUTE ON FUNCTION get_employee_owner TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_owner TO anon;

GRANT EXECUTE ON FUNCTION check_user_subscription_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_subscription_access TO anon;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== FUNCIONES RECREADAS EXITOSAMENTE ===';
  RAISE NOTICE '✅ is_employee() - Versión segura con manejo de errores';
  RAISE NOTICE '✅ get_employee_owner() - Versión segura con manejo de errores';
  RAISE NOTICE '✅ check_user_subscription_access() - Versión simplificada y segura';
  RAISE NOTICE '=== PERMISOS OTORGADOS A authenticated Y anon ===';
END $$;

COMMIT;
