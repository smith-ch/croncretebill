-- ============================================================================
-- EJEMPLOS DE USO - Sistema de Gestión de Suscripciones
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR CONFIGURACIÓN INICIAL
-- ============================================================================

-- Ver rol de subscription_manager
SELECT * FROM user_roles WHERE name = 'subscription_manager';

-- Ver usuario configurado como subscription manager
SELECT 
  au.email,
  up.display_name,
  ur.name as role,
  up.is_active
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
JOIN user_roles ur ON ur.id = up.role_id
WHERE au.email = 'smithrodriguez345@gmail.com';

-- Ver todos los planes disponibles
SELECT 
  name,
  display_name,
  price_monthly,
  price_yearly,
  max_users,
  max_invoices_per_month,
  is_active,
  is_default
FROM subscription_plans
ORDER BY price_monthly;

-- ============================================================================
-- 2. CREAR SUSCRIPCIONES DE EJEMPLO
-- ============================================================================

-- Crear suscripción en plan gratuito (trial de 30 días)
SELECT create_manual_subscription(
  'usuario1@example.com',
  'free',
  NOW(),
  NOW() + INTERVAL '30 days',
  'trial',
  'monthly',
  'smithrodriguez345@gmail.com',
  'Usuario nuevo - Trial de 30 días'
);

-- Crear suscripción en plan Starter (mensual)
SELECT create_manual_subscription(
  'usuario2@example.com',
  'starter',
  NOW(),
  NOW() + INTERVAL '1 month',
  'active',
  'monthly',
  'smithrodriguez345@gmail.com',
  'Cliente pagado - Plan Starter Mensual'
);

-- Crear suscripción en plan Professional (anual)
SELECT create_manual_subscription(
  'usuario3@example.com',
  'professional',
  NOW(),
  NOW() + INTERVAL '1 year',
  'active',
  'yearly',
  'smithrodriguez345@gmail.com',
  'Cliente premium - Plan Professional Anual con descuento'
);

-- Crear suscripción en plan Enterprise (sin fecha límite)
SELECT create_manual_subscription(
  'usuario4@example.com',
  'enterprise',
  NOW(),
  NULL, -- Sin fecha de expiración
  'active',
  'lifetime',
  'smithrodriguez345@gmail.com',
  'Cliente enterprise - Contrato personalizado'
);

-- ============================================================================
-- 3. ACTUALIZAR ESTADOS DE SUSCRIPCIONES
-- ============================================================================

-- Activar una suscripción trial después del pago
SELECT update_subscription_status(
  'usuario1@example.com',
  'active',
  'Pago recibido - Convertido de trial a active',
  'smithrodriguez345@gmail.com'
);

-- Suspender por falta de pago
SELECT update_subscription_status(
  'usuario2@example.com',
  'suspended',
  'Pago atrasado - Suspendido hasta regularización',
  'smithrodriguez345@gmail.com'
);

-- Cancelar suscripción
SELECT update_subscription_status(
  'usuario3@example.com',
  'cancelled',
  'Usuario solicitó cancelación',
  'smithrodriguez345@gmail.com'
);

-- Marcar como expirada
SELECT update_subscription_status(
  'usuario4@example.com',
  'expired',
  'Suscripción venció - Renovación pendiente',
  'smithrodriguez345@gmail.com'
);

-- ============================================================================
-- 4. CONSULTAS ÚTILES PARA REPORTES
-- ============================================================================

-- Ver todas las suscripciones activas
SELECT 
  au.email,
  sp.display_name as plan,
  us.status,
  us.billing_cycle,
  us.start_date,
  us.end_date,
  us.notes
FROM user_subscriptions us
JOIN auth.users au ON au.id = us.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.status = 'active'
ORDER BY us.created_at DESC;

-- Suscripciones por estado
SELECT 
  status,
  COUNT(*) as total,
  SUM(CASE WHEN billing_cycle = 'monthly' THEN 1 ELSE 0 END) as monthly,
  SUM(CASE WHEN billing_cycle = 'yearly' THEN 1 ELSE 0 END) as yearly
FROM user_subscriptions
GROUP BY status
ORDER BY total DESC;

-- Suscripciones por plan
SELECT 
  sp.display_name as plan,
  sp.price_monthly,
  COUNT(*) as total_subscribers,
  SUM(CASE WHEN us.status = 'active' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN us.status = 'trial' THEN 1 ELSE 0 END) as trial,
  SUM(CASE WHEN us.status = 'suspended' THEN 1 ELSE 0 END) as suspended
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
GROUP BY sp.id, sp.display_name, sp.price_monthly
ORDER BY total_subscribers DESC;

-- Ingresos mensuales estimados (solo suscripciones activas)
SELECT 
  SUM(
    CASE 
      WHEN us.billing_cycle = 'monthly' THEN sp.price_monthly
      WHEN us.billing_cycle = 'yearly' THEN sp.price_yearly / 12
      ELSE 0
    END
  ) as ingreso_mensual_estimado,
  COUNT(*) as total_suscripciones_activas
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.status = 'active';

-- Suscripciones que vencen en los próximos 30 días
SELECT 
  au.email,
  sp.display_name as plan,
  us.end_date,
  us.status,
  EXTRACT(DAY FROM (us.end_date - NOW())) as dias_restantes
FROM user_subscriptions us
JOIN auth.users au ON au.id = us.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.end_date IS NOT NULL
  AND us.end_date > NOW()
  AND us.end_date < NOW() + INTERVAL '30 days'
  AND us.status IN ('active', 'trial')
ORDER BY us.end_date;

-- Historial reciente de cambios (últimos 20)
SELECT 
  sh.created_at,
  au.email as usuario,
  sh.action,
  sh.old_status,
  sh.new_status,
  sh.changed_by_email as modificado_por,
  sh.reason
FROM subscription_history sh
JOIN auth.users au ON au.id = sh.user_id
ORDER BY sh.created_at DESC
LIMIT 20;

-- ============================================================================
-- 5. MANTENIMIENTO Y LIMPIEZA
-- ============================================================================

-- Ver suscripciones que expiraron hace más de 30 días y aún están 'active'
-- (Para marcarlas como expired)
SELECT 
  au.email,
  sp.display_name as plan,
  us.end_date,
  us.status,
  NOW() - us.end_date as tiempo_expirado
FROM user_subscriptions us
JOIN auth.users au ON au.id = us.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.end_date IS NOT NULL
  AND us.end_date < NOW() - INTERVAL '30 days'
  AND us.status = 'active';

-- Ver suscripciones sin fecha de fin (lifetime o custom)
SELECT 
  au.email,
  sp.display_name as plan,
  us.billing_cycle,
  us.status,
  us.start_date,
  us.notes
FROM user_subscriptions us
JOIN auth.users au ON au.id = us.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.end_date IS NULL
ORDER BY us.start_date DESC;

-- ============================================================================
-- 6. ANÁLISIS DE CONVERSIÓN
-- ============================================================================

-- Tasa de conversión de trial a pago
WITH trial_stats AS (
  SELECT 
    COUNT(*) as total_trials,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as converted_to_active
  FROM user_subscriptions
  WHERE billing_cycle = 'monthly' OR billing_cycle = 'yearly'
)
SELECT 
  total_trials,
  converted_to_active,
  ROUND((converted_to_active::numeric / NULLIF(total_trials, 0)) * 100, 2) as conversion_rate_percent
FROM trial_stats;

-- Churn rate (cancelaciones)
WITH subscription_stats AS (
  SELECT 
    COUNT(*) as total_subs,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subs,
    SUM(CASE WHEN status IN ('active', 'trial') THEN 1 ELSE 0 END) as active_subs
  FROM user_subscriptions
)
SELECT 
  total_subs,
  active_subs,
  cancelled_subs,
  ROUND((cancelled_subs::numeric / NULLIF(total_subs, 0)) * 100, 2) as churn_rate_percent
FROM subscription_stats;

-- ============================================================================
-- 7. FUNCIONES DE VERIFICACIÓN
-- ============================================================================

-- Verificar si un usuario es subscription manager
SELECT is_subscription_manager('user-id-aqui');

-- Ver suscripción de un usuario específico
SELECT 
  au.email,
  sp.display_name as plan,
  us.status,
  us.billing_cycle,
  us.start_date,
  us.end_date,
  us.current_users_count,
  us.current_invoices_count,
  us.current_products_count,
  us.current_clients_count,
  us.notes
FROM user_subscriptions us
JOIN auth.users au ON au.id = us.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE au.email = 'usuario@example.com';

-- ============================================================================
-- 8. EJEMPLOS DE UPGRADE/DOWNGRADE
-- ============================================================================

-- Upgrade de Free a Starter
SELECT create_manual_subscription(
  'usuario1@example.com',
  'starter',
  NOW(),
  NOW() + INTERVAL '1 month',
  'active',
  'monthly',
  'smithrodriguez345@gmail.com',
  'Upgrade de Free a Starter - Primer mes pagado'
);

-- Downgrade de Professional a Starter
SELECT create_manual_subscription(
  'usuario3@example.com',
  'starter',
  NOW(),
  NOW() + INTERVAL '1 month',
  'active',
  'monthly',
  'smithrodriguez345@gmail.com',
  'Downgrade solicitado por el usuario - Reducción de costos'
);

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
1. Todas las funciones registran automáticamente en subscription_history
2. Los cambios de plan crean una nueva entrada y registran el cambio
3. Los timestamps se actualizan automáticamente con triggers
4. Las políticas RLS protegen el acceso a los datos
5. Solo subscription_manager puede ver y gestionar todas las suscripciones
6. Los usuarios regulares solo ven su propia suscripción
*/
