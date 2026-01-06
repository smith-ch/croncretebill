-- ============================================================================
-- Script 67: Grant Super Admin Powers to smithrodriguez345@gmail.com
-- Propósito: Otorgar poderes de super administrador con acceso total
-- Fecha: 2026-01-05
-- ============================================================================

BEGIN;

-- 1. Crear rol de Super Admin si no existe
INSERT INTO user_roles (name, display_name, description)
VALUES (
  'super_admin',
  'Super Administrador',
  'Administrador supremo con acceso total al sistema, métricas globales y gestión completa'
)
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- 2. Asignar rol de Super Admin al usuario
DO $$
DECLARE
  super_admin_role_id UUID;
  admin_user_id UUID;
  admin_email VARCHAR := 'smithrodriguez345@gmail.com';
BEGIN
  -- Buscar el rol de super_admin
  SELECT id INTO super_admin_role_id
  FROM user_roles
  WHERE name = 'super_admin';

  RAISE NOTICE 'Rol super_admin: %', super_admin_role_id;

  -- Buscar el usuario por email
  SELECT user_id INTO admin_user_id
  FROM user_profiles
  WHERE email = admin_email;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario % no encontrado', admin_email;
  END IF;

  RAISE NOTICE 'Usuario encontrado: %', admin_user_id;

  -- Asignar el rol de super_admin
  UPDATE user_profiles
  SET role_id = super_admin_role_id,
      updated_at = NOW()
  WHERE user_id = admin_user_id;

  RAISE NOTICE '✅ Rol super_admin asignado a %', admin_email;
END $$;

-- 3. Crear tabla para permisos especiales si no existe
CREATE TABLE IF NOT EXISTS super_admin_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL,
  permission_value BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_key)
);

-- 4. Otorgar permisos especiales al super admin
DO $$
DECLARE
  admin_user_id UUID;
  admin_email VARCHAR := 'smithrodriguez345@gmail.com';
  permissions TEXT[] := ARRAY[
    'view_all_users',
    'edit_all_users',
    'delete_users',
    'view_all_subscriptions',
    'edit_all_subscriptions',
    'create_subscriptions',
    'delete_subscriptions',
    'bypass_subscription_check',
    'view_global_metrics',
    'view_system_logs',
    'manage_all_invoices',
    'manage_all_products',
    'manage_all_clients',
    'access_all_companies',
    'export_all_data',
    'manage_system_settings',
    'view_financial_reports',
    'manage_employee_data',
    'override_limits',
    'debug_mode'
  ];
  perm TEXT;
BEGIN
  -- Buscar el usuario
  SELECT user_id INTO admin_user_id
  FROM user_profiles
  WHERE email = admin_email;

  -- Insertar cada permiso
  FOREACH perm IN ARRAY permissions
  LOOP
    INSERT INTO super_admin_permissions (user_id, permission_key, permission_value)
    VALUES (admin_user_id, perm, true)
    ON CONFLICT (user_id, permission_key) 
    DO UPDATE SET permission_value = true, created_at = NOW();
    
    RAISE NOTICE '✓ Permiso otorgado: %', perm;
  END LOOP;

  RAISE NOTICE '✅ Total de permisos especiales otorgados: %', array_length(permissions, 1);
END $$;

-- 5. Crear función para verificar si es super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.user_id = p_user_id
    AND ur.name = 'super_admin'
    AND up.is_active = true
  ) INTO v_is_super_admin;

  RETURN COALESCE(v_is_super_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;

-- 6. Crear función para verificar permiso específico
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Super admin siempre tiene todos los permisos
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- Verificar permiso específico
  SELECT COALESCE(permission_value, false) INTO v_has_permission
  FROM super_admin_permissions
  WHERE user_id = p_user_id
  AND permission_key = p_permission_key;

  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_permission(UUID, VARCHAR) TO authenticated;

-- 7. Crear vista de métricas globales (solo para super admins)
CREATE OR REPLACE VIEW super_admin_global_metrics AS
SELECT
  -- Usuarios
  (SELECT COUNT(*) FROM user_profiles WHERE parent_user_id IS NULL) as total_owners,
  (SELECT COUNT(*) FROM user_profiles WHERE parent_user_id IS NOT NULL) as total_employees,
  (SELECT COUNT(*) FROM user_profiles) as total_users,
  
  -- Suscripciones
  (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active') as active_subscriptions,
  (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'trial') as trial_subscriptions,
  (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'expired') as expired_subscriptions,
  (SELECT COUNT(*) FROM user_subscriptions) as total_subscriptions,
  
  -- Facturas
  (SELECT COUNT(*) FROM invoices) as total_invoices,
  (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status = 'paid') as total_revenue,
  (SELECT COUNT(*) FROM invoices WHERE status = 'pending') as pending_invoices,
  
  -- Productos y Servicios
  (SELECT COUNT(*) FROM products) as total_products,
  (SELECT COUNT(*) FROM services) as total_services,
  
  -- Clientes
  (SELECT COUNT(*) FROM clients) as total_clients,
  
  -- Actividad reciente
  (SELECT COUNT(*) FROM invoices WHERE created_at >= NOW() - INTERVAL '30 days') as invoices_last_30_days,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_last_30_days;

-- 8. Crear función para obtener métricas globales
CREATE OR REPLACE FUNCTION get_global_metrics(p_user_id UUID)
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_category TEXT
) AS $$
BEGIN
  -- Verificar que sea super admin
  IF NOT is_super_admin(p_user_id) THEN
    RAISE EXCEPTION 'Acceso denegado: Se requiere rol de super_admin';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    VALUES
      ('total_owners', (SELECT COUNT(*)::NUMERIC FROM user_profiles WHERE parent_user_id IS NULL), 'Usuarios'),
      ('total_employees', (SELECT COUNT(*)::NUMERIC FROM user_profiles WHERE parent_user_id IS NOT NULL), 'Usuarios'),
      ('total_users', (SELECT COUNT(*)::NUMERIC FROM user_profiles), 'Usuarios'),
      ('active_subscriptions', (SELECT COUNT(*)::NUMERIC FROM user_subscriptions WHERE status = 'active'), 'Suscripciones'),
      ('trial_subscriptions', (SELECT COUNT(*)::NUMERIC FROM user_subscriptions WHERE status = 'trial'), 'Suscripciones'),
      ('expired_subscriptions', (SELECT COUNT(*)::NUMERIC FROM user_subscriptions WHERE status = 'expired'), 'Suscripciones'),
      ('total_subscriptions', (SELECT COUNT(*)::NUMERIC FROM user_subscriptions), 'Suscripciones'),
      ('total_invoices', (SELECT COUNT(*)::NUMERIC FROM invoices), 'Finanzas'),
      ('total_revenue', (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status = 'paid'), 'Finanzas'),
      ('pending_invoices', (SELECT COUNT(*)::NUMERIC FROM invoices WHERE status = 'pending'), 'Finanzas'),
      ('total_products', (SELECT COUNT(*)::NUMERIC FROM products), 'Inventario'),
      ('total_services', (SELECT COUNT(*)::NUMERIC FROM services), 'Inventario'),
      ('total_clients', (SELECT COUNT(*)::NUMERIC FROM clients), 'Clientes')
  ) AS metrics(metric_name, metric_value, metric_category);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_global_metrics(UUID) TO authenticated;

-- 9. Modificar función check_subscription para super admins
CREATE OR REPLACE FUNCTION check_subscription_access(p_user_id UUID)
RETURNS TABLE (
  has_access BOOLEAN,
  subscription_status VARCHAR,
  plan_name VARCHAR,
  reason VARCHAR
) AS $$
BEGIN
  -- Super Admin siempre tiene acceso
  IF is_super_admin(p_user_id) THEN
    RETURN QUERY SELECT true, 'super_admin'::VARCHAR, 'Super Admin'::VARCHAR, 'Acceso total como Super Administrador'::VARCHAR;
    RETURN;
  END IF;

  -- Subscription Manager siempre tiene acceso
  IF is_subscription_manager(p_user_id) THEN
    RETURN QUERY SELECT true, 'subscription_manager'::VARCHAR, 'Subscription Manager'::VARCHAR, 'Acceso total como Gestor de Suscripciones'::VARCHAR;
    RETURN;
  END IF;

  -- Verificar suscripción normal
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
      WHEN us.status = 'expired' THEN 'Suscripción expirada'
      WHEN us.status = 'cancelled' THEN 'Suscripción cancelada'
      ELSE 'Sin suscripción activa'
    END as reason
  FROM user_profiles up
  LEFT JOIN user_subscriptions us ON up.user_id = us.user_id
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_subscription_access(UUID) TO authenticated;

COMMIT;

-- 10. Verificación final
SELECT 
  '=== USUARIO SUPER ADMIN ===' as info,
  up.user_id,
  up.email,
  up.display_name,
  ur.name as role_name,
  up.is_active,
  (SELECT COUNT(*) FROM super_admin_permissions WHERE user_id = up.user_id) as total_permissions
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'smithrodriguez345@gmail.com';

-- 11. Listar todos los permisos
SELECT 
  '=== PERMISOS ESPECIALES ===' as info,
  permission_key,
  permission_value,
  sap.created_at
FROM super_admin_permissions sap
JOIN user_profiles up ON sap.user_id = up.user_id
WHERE up.email = 'smithrodriguez345@gmail.com'
ORDER BY permission_key;

-- 12. Información
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🔥 SUPER ADMIN POWERS ACTIVADOS';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Rol: super_admin';
  RAISE NOTICE '✅ Acceso total sin restricciones';
  RAISE NOTICE '✅ Bypass de verificación de suscripciones';
  RAISE NOTICE '✅ Ver y gestionar TODOS los usuarios';
  RAISE NOTICE '✅ Ver y gestionar TODAS las suscripciones';
  RAISE NOTICE '✅ Acceso a métricas globales del sistema';
  RAISE NOTICE '✅ Ver logs y estadísticas completas';
  RAISE NOTICE '✅ Gestionar todas las facturas';
  RAISE NOTICE '✅ Gestionar todos los productos/servicios';
  RAISE NOTICE '✅ Gestionar todos los clientes';
  RAISE NOTICE '✅ Exportar todos los datos';
  RAISE NOTICE '✅ Configuraciones del sistema';
  RAISE NOTICE '✅ Reportes financieros globales';
  RAISE NOTICE '✅ Gestión de empleados global';
  RAISE NOTICE '✅ Override de límites';
  RAISE NOTICE '✅ Modo debug activado';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Funciones RPC disponibles:';
  RAISE NOTICE '   - is_super_admin(user_id)';
  RAISE NOTICE '   - has_permission(user_id, permission_key)';
  RAISE NOTICE '   - get_global_metrics(user_id)';
  RAISE NOTICE '   - check_subscription_access(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
END $$;
