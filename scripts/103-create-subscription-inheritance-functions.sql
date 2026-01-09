-- Script para permitir que empleados hereden la suscripción de su owner
-- Crea una función RPC que bypasea el RLS para obtener la suscripción correcta

-- ========================================
-- FUNCIÓN RPC PARA OBTENER SUSCRIPCIÓN (OWNER O HEREDADA)
-- ========================================

CREATE OR REPLACE FUNCTION get_effective_subscription(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  user_id UUID,
  plan_id UUID,
  plan_name TEXT,
  plan_display_name TEXT,
  current_max_users INTEGER,
  current_max_invoices INTEGER,
  current_max_products INTEGER,
  current_max_clients INTEGER,
  status TEXT,
  is_inherited BOOLEAN,
  owner_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasea RLS
AS $$
DECLARE
  profile_data RECORD;
  subscription_data RECORD;
  effective_owner_id UUID;
BEGIN
  -- Obtener perfil del usuario
  SELECT 
    up.user_id,
    up.parent_user_id,
    up.display_name
  INTO profile_data
  FROM user_profiles up
  WHERE up.user_id = user_uuid
  AND up.is_active = true;

  -- Determinar el owner efectivo
  IF profile_data.parent_user_id IS NOT NULL THEN
    -- Es empleado, usar el owner
    effective_owner_id := profile_data.parent_user_id;
    RAISE NOTICE 'Usuario es EMPLEADO, usando suscripción del owner: %', effective_owner_id;
  ELSE
    -- Es owner, usar su propia suscripción
    effective_owner_id := user_uuid;
    RAISE NOTICE 'Usuario es OWNER, usando su propia suscripción';
  END IF;

  -- Obtener suscripción del owner efectivo
  SELECT 
    us.user_id,
    us.plan_id,
    sp.name,
    sp.display_name,
    us.current_max_users,
    us.current_max_invoices,
    us.current_max_products,
    us.current_max_clients,
    us.status
  INTO subscription_data
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = effective_owner_id
  AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Retornar datos de suscripción
  IF subscription_data.user_id IS NOT NULL THEN
    RAISE NOTICE 'Suscripción encontrada: % - %', subscription_data.name, subscription_data.display_name;
    RETURN QUERY SELECT
      subscription_data.user_id,
      subscription_data.plan_id,
      subscription_data.name::TEXT,
      subscription_data.display_name::TEXT,
      subscription_data.current_max_users,
      subscription_data.current_max_invoices,
      subscription_data.current_max_products,
      subscription_data.current_max_clients,
      subscription_data.status::TEXT,
      (profile_data.parent_user_id IS NOT NULL)::BOOLEAN, -- is_inherited
      effective_owner_id;
  ELSE
    -- No hay suscripción activa, retornar defaults del plan gratuito
    RAISE NOTICE 'No se encontró suscripción activa, usando valores por defecto';
    RETURN QUERY SELECT
      effective_owner_id,
      NULL::UUID,
      'free'::TEXT,
      'Plan Gratuito'::TEXT,
      1::INTEGER,
      5::INTEGER,
      10::INTEGER,
      5::INTEGER,
      'free'::TEXT,
      (profile_data.parent_user_id IS NOT NULL)::BOOLEAN,
      effective_owner_id;
  END IF;
END;
$$;

-- ========================================
-- FUNCIÓN RPC PARA CONTAR USO (COMPARTIDO ENTRE OWNER Y EMPLEADOS)
-- ========================================

CREATE OR REPLACE FUNCTION get_subscription_usage(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  users_count INTEGER,
  invoices_count INTEGER,
  products_count INTEGER,
  clients_count INTEGER,
  owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasea RLS
AS $$
DECLARE
  profile_data RECORD;
  effective_owner_id UUID;
  month_start TIMESTAMP;
BEGIN
  -- Obtener perfil del usuario
  SELECT 
    up.user_id,
    up.parent_user_id
  INTO profile_data
  FROM user_profiles up
  WHERE up.user_id = user_uuid;

  -- Determinar el owner efectivo
  IF profile_data.parent_user_id IS NOT NULL THEN
    effective_owner_id := profile_data.parent_user_id;
  ELSE
    effective_owner_id := user_uuid;
  END IF;

  -- Calcular inicio del mes
  month_start := date_trunc('month', CURRENT_TIMESTAMP);

  -- Contar recursos del OWNER (compartidos con empleados)
  RETURN QUERY
  SELECT
    -- Contar empleados del owner
    (SELECT COUNT(*)::INTEGER FROM user_profiles WHERE parent_user_id = effective_owner_id),
    -- Contar facturas del mes (invoices + thermal_receipts)
    (
      (SELECT COUNT(*)::INTEGER FROM invoices WHERE user_id = effective_owner_id AND created_at >= month_start) +
      (SELECT COUNT(*)::INTEGER FROM thermal_receipts WHERE user_id = effective_owner_id AND created_at >= month_start)
    ),
    -- Contar productos + servicios
    (
      (SELECT COUNT(*)::INTEGER FROM products WHERE user_id = effective_owner_id) +
      (SELECT COUNT(*)::INTEGER FROM services WHERE user_id = effective_owner_id)
    ),
    -- Contar clientes
    (SELECT COUNT(*)::INTEGER FROM clients WHERE user_id = effective_owner_id),
    effective_owner_id;
END;
$$;

-- ========================================
-- PRUEBAS
-- ========================================

-- Probar para cada usuario
DO $$
DECLARE
  user_rec RECORD;
  sub_result RECORD;
  usage_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRUEBA DE HERENCIA DE SUSCRIPCIÓN';
  RAISE NOTICE '========================================';
  
  FOR user_rec IN 
    SELECT user_id, display_name, parent_user_id 
    FROM user_profiles 
    ORDER BY parent_user_id NULLS FIRST
  LOOP
    SELECT * INTO sub_result FROM get_effective_subscription(user_rec.user_id);
    SELECT * INTO usage_result FROM get_subscription_usage(user_rec.user_id);
    
    RAISE NOTICE '';
    RAISE NOTICE 'Usuario: %', user_rec.display_name;
    RAISE NOTICE '  Tipo: %', CASE WHEN user_rec.parent_user_id IS NULL THEN 'OWNER' ELSE 'EMPLEADO' END;
    IF user_rec.parent_user_id IS NOT NULL THEN
      RAISE NOTICE '  Owner: %', user_rec.parent_user_id;
    END IF;
    RAISE NOTICE '  Plan: %', sub_result.plan_display_name;
    RAISE NOTICE '  Límites: % usuarios, % facturas, % productos, % clientes',
      sub_result.current_max_users,
      sub_result.current_max_invoices,
      sub_result.current_max_products,
      sub_result.current_max_clients;
    RAISE NOTICE '  Uso actual: % usuarios, % facturas, % productos, % clientes',
      usage_result.users_count,
      usage_result.invoices_count,
      usage_result.products_count,
      usage_result.clients_count;
    RAISE NOTICE '  Heredado: %', sub_result.is_inherited;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

SELECT '✅ Funciones creadas exitosamente' as status;
