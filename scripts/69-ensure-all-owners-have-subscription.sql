-- ============================================================================
-- Script 69: Asegurar que todos los owners tengan suscripción
-- Propósito: Crear suscripciones Free para owners sin suscripción
-- Fecha: 2026-01-06
-- ============================================================================

BEGIN;

-- 1. Verificar estado actual
SELECT 
  '=== ESTADO ACTUAL ===' as info,
  (SELECT COUNT(*) FROM user_profiles WHERE parent_user_id IS NULL) as total_owners,
  (SELECT COUNT(DISTINCT us.user_id) FROM user_subscriptions us 
   JOIN user_profiles up ON us.user_id = up.user_id 
   WHERE up.parent_user_id IS NULL) as owners_with_subscription;

-- 2. Crear suscripciones Free para owners sin suscripción
DO $$
DECLARE
  free_plan_id UUID;
  owner_record RECORD;
  created_count INTEGER := 0;
BEGIN
  -- Obtener ID del plan Free
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;

  IF free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan Free no encontrado';
  END IF;

  RAISE NOTICE 'Plan Free ID: %', free_plan_id;
  RAISE NOTICE '==========================================';

  -- Recorrer owners sin suscripción
  FOR owner_record IN (
    SELECT up.user_id, up.email
    FROM user_profiles up
    WHERE up.parent_user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_subscriptions us WHERE us.user_id = up.user_id
    )
  ) LOOP
    -- Crear suscripción Free
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_cycle,
      start_date,
      created_at,
      updated_at
    ) VALUES (
      owner_record.user_id,
      free_plan_id,
      'active',
      'monthly',
      NOW(),
      NOW(),
      NOW()
    );

    created_count := created_count + 1;
    RAISE NOTICE '✅ Suscripción Free creada para: %', owner_record.email;
  END LOOP;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total suscripciones Free creadas: %', created_count;
END $$;

-- 3. Verificar resultado final
SELECT 
  '=== RESULTADO FINAL ===' as info,
  us.id as subscription_id,
  up.email,
  sp.display_name as plan_name,
  us.status,
  us.billing_cycle,
  us.start_date
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE up.parent_user_id IS NULL
ORDER BY up.email;

-- 4. Resumen final
SELECT 
  '=== RESUMEN FINAL ===' as info,
  (SELECT COUNT(*) FROM user_profiles WHERE parent_user_id IS NULL) as total_owners,
  (SELECT COUNT(DISTINCT us.user_id) FROM user_subscriptions us 
   JOIN user_profiles up ON us.user_id = up.user_id 
   WHERE up.parent_user_id IS NULL) as owners_with_subscription,
  (SELECT COUNT(*) FROM user_profiles up 
   WHERE up.parent_user_id IS NULL 
   AND NOT EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = up.user_id)) as owners_without_subscription;

COMMIT;
