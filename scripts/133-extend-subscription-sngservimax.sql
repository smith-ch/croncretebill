-- Script para activar acceso de carlospeguero26@gmail.com
-- Fecha: 2026-02-03

-- Primero, obtener el user_id del usuario
DO $$
DECLARE
  v_user_id uuid;
  v_subscription_id uuid;
  v_current_end_date timestamp with time zone;
  v_new_end_date timestamp with time zone;
BEGIN
  -- Buscar el usuario por email
  SELECT user_id INTO v_user_id
  FROM user_profiles
  WHERE email = 'carlospeguero26@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: carlospeguero26@gmail.com';
  END IF;

  RAISE NOTICE 'Usuario encontrado: %', v_user_id;

  -- Activar el usuario si está inactivo
  UPDATE user_profiles
  SET is_active = true
  WHERE user_id = v_user_id;

  RAISE NOTICE '✅ Usuario activado';

  -- Buscar la suscripción del usuario
  SELECT id, end_date INTO v_subscription_id, v_current_end_date
  FROM user_subscriptions
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró suscripción para el usuario carlospeguero26@gmail.com';
  END IF;

  RAISE NOTICE 'Suscripción encontrada: %', v_subscription_id;
  RAISE NOTICE 'Fecha de fin actual: %', v_current_end_date;

  -- Calcular nueva fecha: si tiene end_date, extender desde ahí, sino desde hoy + 1 mes
  IF v_current_end_date IS NOT NULL THEN
    v_new_end_date := v_current_end_date + INTERVAL '1 month';
  ELSE
    v_new_end_date := CURRENT_TIMESTAMP + INTERVAL '1 month';
  END IF;

  RAISE NOTICE 'Nueva fecha de fin: %', v_new_end_date;

  -- Activar y actualizar la suscripción
  UPDATE user_subscriptions
  SET 
    status = 'active',
    end_date = v_new_end_date,
    notes = COALESCE(notes, '') || E'\n[' || CURRENT_TIMESTAMP::text || '] Suscripción activada y extendida por 1 mes (vía script SQL)',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = v_subscription_id;

  RAISE NOTICE '✅ Suscripción activada y extendida exitosamente';
  
  -- Mostrar resultado
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ ACCESO CONCEDIDO';
  RAISE NOTICE 'Usuario: carlospeguero26@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Status: ACTIVE';
  RAISE NOTICE 'Subscription ID: %', v_subscription_id;
  RAISE NOTICE 'Fecha anterior: %', v_current_end_date;
  RAISE NOTICE 'Fecha nueva: %', v_new_end_date;
  RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- Verificar el resultado
SELECT 
  up.email,
  up.is_active as usuario_activo,
  us.status as estado_suscripcion,
  us.billing_cycle,
  sp.display_name as plan,
  us.start_date,
  us.end_date,
  CASE 
    WHEN us.end_date > CURRENT_TIMESTAMP THEN '✅ ACCESO PERMITIDO'
    ELSE '❌ EXPIRADO'
  END as acceso,
  us.notes
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.email = 'carlospeguero26@gmail.com'
ORDER BY us.created_at DESC
LIMIT 1;
