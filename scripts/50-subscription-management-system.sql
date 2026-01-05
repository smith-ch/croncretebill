-- Script 50: Sistema de Gestión de Suscripciones
-- Permite gestionar suscripciones de usuarios con planes y permisos especiales
-- Usuario manager: smithrodriguez345@gmail.com
-- IMPORTANTE: Los usuarios con rol 'subscription_manager' tienen acceso SIEMPRE,
--             sin importar si tienen suscripción activa o no

-- ============================================================================
-- 1. TABLA DE PLANES DE SUSCRIPCIÓN
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Características del plan
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  max_users INTEGER DEFAULT 1,
  max_invoices_per_month INTEGER,
  max_products INTEGER,
  max_clients INTEGER,
  max_storage_gb INTEGER,
  
  -- Features habilitadas
  features JSONB DEFAULT '{}' NOT NULL,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_default ON subscription_plans(is_default) WHERE is_default = true;

-- ============================================================================
-- 2. TABLA DE SUSCRIPCIONES DE USUARIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  
  -- Fechas de suscripción
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'cancelled', 'trial', 'suspended')),
  billing_cycle VARCHAR(50) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime', 'custom')),
  
  -- Información de pago
  payment_method VARCHAR(100),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  amount_paid DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'DOP',
  
  -- Gestión manual
  managed_by UUID REFERENCES auth.users(id), -- Usuario que gestiona la suscripción
  notes TEXT, -- Notas del administrador
  
  -- Límites actuales (pueden diferir del plan por gestión manual)
  current_max_users INTEGER,
  current_max_invoices INTEGER,
  current_max_products INTEGER,
  current_max_clients INTEGER,
  
  -- Uso actual
  current_users_count INTEGER DEFAULT 0,
  current_invoices_count INTEGER DEFAULT 0,
  current_products_count INTEGER DEFAULT 0,
  current_clients_count INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraint: Una suscripción activa por usuario
  UNIQUE(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_managed_by ON user_subscriptions(managed_by);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date);

-- ============================================================================
-- 3. TABLA DE HISTORIAL DE SUSCRIPCIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cambios realizados
  action VARCHAR(100) NOT NULL, -- 'created', 'activated', 'renewed', 'upgraded', 'downgraded', 'cancelled', 'suspended'
  old_plan_id UUID REFERENCES subscription_plans(id),
  new_plan_id UUID REFERENCES subscription_plans(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Información adicional
  reason TEXT,
  notes TEXT,
  
  -- Usuario que realizó el cambio
  changed_by UUID REFERENCES auth.users(id),
  changed_by_email VARCHAR(255),
  
  -- Datos del cambio
  change_data JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_changed_by ON subscription_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);

-- ============================================================================
-- 4. FUNCIÓN PARA ACTUALIZAR TIMESTAMPS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_plans_timestamp ON subscription_plans;
CREATE TRIGGER update_subscription_plans_timestamp
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS update_user_subscriptions_timestamp ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_timestamp
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- ============================================================================
-- 5. FUNCIÓN PARA REGISTRAR CAMBIOS EN EL HISTORIAL
-- ============================================================================
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR(100);
  v_user_email VARCHAR(255);
BEGIN
  -- Determinar la acción
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'active' THEN
        v_action := 'activated';
      ELSIF NEW.status = 'cancelled' THEN
        v_action := 'cancelled';
      ELSIF NEW.status = 'suspended' THEN
        v_action := 'suspended';
      ELSIF NEW.status = 'expired' THEN
        v_action := 'expired';
      ELSE
        v_action := 'status_changed';
      END IF;
    ELSIF OLD.plan_id != NEW.plan_id THEN
      v_action := 'plan_changed';
    ELSE
      v_action := 'updated';
    END IF;
  END IF;

  -- Obtener email del usuario que realiza el cambio
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.managed_by;

  -- Insertar en historial
  INSERT INTO subscription_history (
    subscription_id,
    user_id,
    action,
    old_plan_id,
    new_plan_id,
    old_status,
    new_status,
    changed_by,
    changed_by_email,
    change_data
  ) VALUES (
    NEW.id,
    NEW.user_id,
    v_action,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.plan_id ELSE NULL END,
    NEW.plan_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    NEW.managed_by,
    v_user_email,
    jsonb_build_object(
      'operation', TG_OP,
      'old_data', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      'new_data', row_to_json(NEW)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_user_subscription_changes ON user_subscriptions;
CREATE TRIGGER log_user_subscription_changes
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_change();

-- ============================================================================
-- 6. AGREGAR ROL DE SUBSCRIPTION MANAGER
-- ============================================================================
INSERT INTO public.user_roles (name, display_name, description, permissions)
VALUES (
  'subscription_manager',
  'Gestor de Suscripciones',
  'Acceso completo para gestionar suscripciones de todos los usuarios',
  '{
    "all": true,
    "subscriptions": {
      "create": true,
      "read": true,
      "update": true,
      "delete": true,
      "manage_all": true
    },
    "users": {
      "read": true,
      "view_subscriptions": true
    },
    "reports": {
      "subscriptions": true,
      "finances": true
    }
  }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- ============================================================================
-- 7. FUNCIÓN PARA ASIGNAR ROL DE SUBSCRIPTION MANAGER
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_subscription_manager_role(
  p_email VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
  v_result JSON;
BEGIN
  -- Buscar usuario por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuario no encontrado con email: ' || p_email
    );
  END IF;

  -- Buscar rol de subscription_manager
  SELECT id INTO v_role_id
  FROM user_roles
  WHERE name = 'subscription_manager';

  IF v_role_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Rol subscription_manager no encontrado'
    );
  END IF;

  -- Crear o actualizar perfil de usuario
  INSERT INTO user_profiles (
    user_id,
    role_id,
    display_name,
    is_active,
    can_create_invoices,
    can_view_finances,
    can_manage_inventory,
    can_manage_clients,
    can_manage_users,
    can_view_reports,
    allowed_modules
  ) VALUES (
    v_user_id,
    v_role_id,
    'Gestor de Suscripciones',
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    '["all", "subscriptions", "users", "reports"]'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role_id = v_role_id,
    display_name = 'Gestor de Suscripciones',
    is_active = true,
    can_manage_users = true,
    can_view_reports = true,
    allowed_modules = '["all", "subscriptions", "users", "reports"]'::jsonb,
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'message', 'Rol de subscription_manager asignado correctamente',
    'user_id', v_user_id,
    'email', p_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir acceso a la función
GRANT EXECUTE ON FUNCTION assign_subscription_manager_role(VARCHAR) TO authenticated;

-- ============================================================================
-- 8. ASIGNAR ROL AL USUARIO ESPECÍFICO
-- ============================================================================
SELECT assign_subscription_manager_role('smithrodriguez345@gmail.com');

-- ============================================================================
-- 9. INSERTAR PLANES DE SUSCRIPCIÓN PREDEFINIDOS
-- ============================================================================
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, max_users, max_invoices_per_month, max_products, max_clients, max_storage_gb, features, is_active, is_default)
VALUES
  (
    'free',
    'Plan Gratuito',
    'Plan básico para empezar',
    0.00,
    0.00,
    1,
    50,
    100,
    50,
    1,
    '{
      "invoices": true,
      "clients": true,
      "products": true,
      "basic_reports": true,
      "email_support": true
    }'::jsonb,
    true,
    true
  ),
  (
    'starter',
    'Plan Starter',
    'Para pequeños negocios',
    500.00,
    5000.00,
    3,
    500,
    500,
    200,
    5,
    '{
      "invoices": true,
      "clients": true,
      "products": true,
      "services": true,
      "inventory": true,
      "basic_reports": true,
      "advanced_reports": false,
      "multiple_users": true,
      "email_support": true,
      "priority_support": false
    }'::jsonb,
    true,
    false
  ),
  (
    'professional',
    'Plan Profesional',
    'Para negocios en crecimiento',
    1500.00,
    15000.00,
    10,
    2000,
    2000,
    1000,
    20,
    '{
      "invoices": true,
      "clients": true,
      "products": true,
      "services": true,
      "inventory": true,
      "projects": true,
      "expenses": true,
      "vehicles": true,
      "drivers": true,
      "agenda": true,
      "basic_reports": true,
      "advanced_reports": true,
      "multiple_users": true,
      "employee_management": true,
      "email_support": true,
      "priority_support": true,
      "phone_support": false
    }'::jsonb,
    true,
    false
  ),
  (
    'enterprise',
    'Plan Empresarial',
    'Para grandes empresas',
    5000.00,
    50000.00,
    null, -- Ilimitado
    null, -- Ilimitado
    null, -- Ilimitado
    null, -- Ilimitado
    100,
    '{
      "invoices": true,
      "clients": true,
      "products": true,
      "services": true,
      "inventory": true,
      "projects": true,
      "expenses": true,
      "vehicles": true,
      "drivers": true,
      "agenda": true,
      "basic_reports": true,
      "advanced_reports": true,
      "custom_reports": true,
      "multiple_users": true,
      "employee_management": true,
      "advanced_permissions": true,
      "api_access": true,
      "custom_integrations": true,
      "white_label": true,
      "email_support": true,
      "priority_support": true,
      "phone_support": true,
      "dedicated_account_manager": true
    }'::jsonb,
    true,
    false
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 10. FUNCIÓN PARA CREAR SUSCRIPCIÓN MANUAL
-- ============================================================================
CREATE OR REPLACE FUNCTION create_manual_subscription(
  p_user_email VARCHAR(255),
  p_plan_name VARCHAR(100),
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_status VARCHAR(50) DEFAULT 'active',
  p_billing_cycle VARCHAR(50) DEFAULT 'monthly',
  p_manager_email VARCHAR(255) DEFAULT 'smithrodriguez345@gmail.com',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_manager_id UUID;
  v_subscription_id UUID;
  v_result JSON;
BEGIN
  -- Buscar usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuario no encontrado: ' || p_user_email
    );
  END IF;

  -- Buscar plan
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE name = p_plan_name AND is_active = true;

  IF v_plan_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Plan no encontrado o inactivo: ' || p_plan_name
    );
  END IF;

  -- Buscar manager
  SELECT id INTO v_manager_id
  FROM auth.users
  WHERE email = p_manager_email;

  -- Crear o actualizar suscripción
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    start_date,
    end_date,
    status,
    billing_cycle,
    managed_by,
    notes,
    current_max_users,
    current_max_invoices,
    current_max_products,
    current_max_clients
  )
  SELECT
    v_user_id,
    v_plan_id,
    p_start_date,
    p_end_date,
    p_status,
    p_billing_cycle,
    v_manager_id,
    p_notes,
    sp.max_users,
    sp.max_invoices_per_month,
    sp.max_products,
    sp.max_clients
  FROM subscription_plans sp
  WHERE sp.id = v_plan_id
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = v_plan_id,
    start_date = p_start_date,
    end_date = p_end_date,
    status = p_status,
    billing_cycle = p_billing_cycle,
    managed_by = v_manager_id,
    notes = p_notes,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Suscripción creada/actualizada correctamente',
    'subscription_id', v_subscription_id,
    'user_id', v_user_id,
    'plan_id', v_plan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir acceso a la función
GRANT EXECUTE ON FUNCTION create_manual_subscription(VARCHAR, VARCHAR, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated;

-- ============================================================================
-- 11. FUNCIÓN PARA ACTUALIZAR ESTADO DE SUSCRIPCIÓN
-- ============================================================================
CREATE OR REPLACE FUNCTION update_subscription_status(
  p_user_email VARCHAR(255),
  p_new_status VARCHAR(50),
  p_reason TEXT DEFAULT NULL,
  p_manager_email VARCHAR(255) DEFAULT 'smithrodriguez345@gmail.com'
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_manager_id UUID;
  v_subscription_id UUID;
BEGIN
  -- Buscar usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuario no encontrado: ' || p_user_email
    );
  END IF;

  -- Buscar manager
  SELECT id INTO v_manager_id
  FROM auth.users
  WHERE email = p_manager_email;

  -- Actualizar suscripción
  UPDATE user_subscriptions
  SET 
    status = p_new_status,
    managed_by = v_manager_id,
    notes = COALESCE(notes || E'\n' || p_reason, p_reason),
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
    updated_at = NOW()
  WHERE user_id = v_user_id
  RETURNING id INTO v_subscription_id;

  IF v_subscription_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No se encontró suscripción para el usuario: ' || p_user_email
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Estado de suscripción actualizado correctamente',
    'subscription_id', v_subscription_id,
    'new_status', p_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir acceso a la función
GRANT EXECUTE ON FUNCTION update_subscription_status(VARCHAR, VARCHAR, TEXT, VARCHAR) TO authenticated;

-- ============================================================================
-- 12. FUNCIÓN PARA VERIFICAR PERMISOS DE SUBSCRIPTION MANAGER
-- ============================================================================
CREATE OR REPLACE FUNCTION is_subscription_manager(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_manager BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.user_id = p_user_id
    AND ur.name = 'subscription_manager'
    AND up.is_active = true
  ) INTO v_is_manager;

  RETURN COALESCE(v_is_manager, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir acceso público a esta función
GRANT EXECUTE ON FUNCTION is_subscription_manager(UUID) TO authenticated;

-- ============================================================================
-- 12B. FUNCIÓN PARA VERIFICAR SI ES EMPLEADO (NO NECESITA SUSCRIPCIÓN PROPIA)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_employee(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_employee BOOLEAN;
BEGIN
  -- Un empleado tiene parent_user_id (es decir, pertenece a un owner)
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE user_id = p_user_id
    AND parent_user_id IS NOT NULL
    AND is_active = true
  ) INTO v_is_employee;

  RETURN COALESCE(v_is_employee, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir acceso público a esta función
GRANT EXECUTE ON FUNCTION is_employee(UUID) TO authenticated;

-- ============================================================================
-- 13. POLÍTICAS RLS PARA SUBSCRIPTION MANAGER
-- ============================================================================

-- Habilitar RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: Subscription managers pueden ver y gestionar todos los planes
DROP POLICY IF EXISTS "Subscription managers can view all plans" ON subscription_plans;
CREATE POLICY "Subscription managers can view all plans"
  ON subscription_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = auth.uid()
      AND ur.name = 'subscription_manager'
      AND up.is_active = true
    )
  );

DROP POLICY IF EXISTS "Subscription managers can manage plans" ON subscription_plans;
CREATE POLICY "Subscription managers can manage plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = auth.uid()
      AND ur.name = 'subscription_manager'
      AND up.is_active = true
    )
  );

-- User Subscriptions: Usuarios pueden ver su propia suscripción
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Subscription managers pueden ver y gestionar todas las suscripciones
DROP POLICY IF EXISTS "Subscription managers can view all subscriptions" ON user_subscriptions;
CREATE POLICY "Subscription managers can view all subscriptions"
  ON user_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = auth.uid()
      AND ur.name = 'subscription_manager'
      AND up.is_active = true
    )
  );

DROP POLICY IF EXISTS "Subscription managers can manage all subscriptions" ON user_subscriptions;
CREATE POLICY "Subscription managers can manage all subscriptions"
  ON user_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = auth.uid()
      AND ur.name = 'subscription_manager'
      AND up.is_active = true
    )
  );

-- Subscription History: Usuarios pueden ver su propio historial
DROP POLICY IF EXISTS "Users can view own history" ON subscription_history;
CREATE POLICY "Users can view own history"
  ON subscription_history FOR SELECT
  USING (user_id = auth.uid());

-- Subscription managers pueden ver todo el historial
DROP POLICY IF EXISTS "Subscription managers can view all history" ON subscription_history;
CREATE POLICY "Subscription managers can view all history"
  ON subscription_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = auth.uid()
      AND ur.name = 'subscription_manager'
      AND up.is_active = true
    )
  );

-- ============================================================================
-- 14. VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que el rol fue creado
SELECT 
  name,
  display_name,
  description
FROM user_roles
WHERE name = 'subscription_manager';

-- Verificar que el usuario tiene el rol asignado
SELECT 
  au.email,
  up.display_name,
  ur.name as role,
  up.is_active
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
JOIN user_roles ur ON ur.id = up.role_id
WHERE au.email = 'smithrodriguez345@gmail.com';

-- Verificar planes creados
SELECT 
  name,
  display_name,
  price_monthly,
  is_active,
  is_default
FROM subscription_plans
ORDER BY price_monthly;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de gestión de suscripciones configurado correctamente';
  RAISE NOTICE '✅ Usuario smithrodriguez345@gmail.com configurado como Gestor de Suscripciones';
  RAISE NOTICE '✅ 4 planes de suscripción creados (free, starter, professional, enterprise)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Funciones disponibles:';
  RAISE NOTICE '   - create_manual_subscription(email, plan, fecha_inicio, fecha_fin, estado, ciclo, manager, notas)';
  RAISE NOTICE '   - update_subscription_status(email, nuevo_estado, razón, manager)';
  RAISE NOTICE '   - is_subscription_manager(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Ejemplo de uso:';
  RAISE NOTICE '   SELECT create_manual_subscription(''usuario@example.com'', ''professional'', NOW(), NOW() + INTERVAL ''1 year'', ''active'', ''yearly'');';
END $$;
