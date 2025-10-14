-- Agregar campos para contraseña de cambio de role y seguridad (solo si no existen)

-- Agregar role_switch_password solo si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'role_switch_password') THEN
    ALTER TABLE company_settings ADD COLUMN role_switch_password TEXT DEFAULT 'admin123';
  END IF;
END $$;

-- Agregar role_password_changed_at solo si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'role_password_changed_at') THEN
    ALTER TABLE company_settings ADD COLUMN role_password_changed_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Agregar role_password_attempts solo si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'role_password_attempts') THEN
    ALTER TABLE company_settings ADD COLUMN role_password_attempts INTEGER DEFAULT 0;
  END IF;
END $$;

-- Agregar role_password_locked_until solo si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'role_password_locked_until') THEN
    ALTER TABLE company_settings ADD COLUMN role_password_locked_until TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Comentarios para documentar los campos de seguridad
COMMENT ON COLUMN company_settings.role_switch_password IS 'Contraseña específica para cambio de roles (independiente del usuario)';
COMMENT ON COLUMN company_settings.role_password_changed_at IS 'Timestamp del último cambio de contraseña de role';
COMMENT ON COLUMN company_settings.role_password_attempts IS 'Contador de intentos fallidos de cambio de contraseña';
COMMENT ON COLUMN company_settings.role_password_locked_until IS 'Timestamp hasta cuando está bloqueado por múltiples intentos fallidos';

-- Actualizar registros existentes que no tengan los nuevos campos
UPDATE company_settings 
SET 
  role_password_changed_at = COALESCE(role_password_changed_at, NOW()),
  role_password_attempts = COALESCE(role_password_attempts, 0)
WHERE role_password_changed_at IS NULL OR role_password_attempts IS NULL;