-- Script para crear sistema de perfiles y permisos de usuarios
-- Permitirá tener empleados con acceso limitado

-- Tabla de roles del sistema
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}' NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de perfiles de usuario extendida
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Usuario padre (dueño)
    role_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL,
    display_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    job_position VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    can_create_invoices BOOLEAN DEFAULT false,
    can_view_finances BOOLEAN DEFAULT false,
    can_manage_inventory BOOLEAN DEFAULT false,
    can_manage_clients BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT false,
    hourly_rate DECIMAL(10,2),
    max_invoice_amount DECIMAL(10,2),
    allowed_modules JSONB DEFAULT '[]' NOT NULL, -- ['invoices', 'inventory', 'clients', etc.]
    restrictions JSONB DEFAULT '{}' NOT NULL, -- Restricciones específicas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Insertar roles predefinidos
INSERT INTO public.user_roles (name, display_name, description, permissions) VALUES
('owner', 'Propietario', 'Acceso completo al sistema', '{"all": true}'),
('manager', 'Gerente', 'Acceso a la mayoría de funciones excepto configuración crítica', '{
    "invoices": {"create": true, "read": true, "update": true, "delete": true},
    "clients": {"create": true, "read": true, "update": true, "delete": true},
    "products": {"create": true, "read": true, "update": true, "delete": true},
    "inventory": {"create": true, "read": true, "update": true, "delete": false},
    "reports": {"read": true},
    "finances": {"read": true}
}'),
('employee', 'Empleado', 'Acceso limitado para tareas operativas', '{
    "invoices": {"create": true, "read": true, "update": false, "delete": false},
    "clients": {"create": false, "read": true, "update": false, "delete": false},
    "products": {"create": false, "read": true, "update": false, "delete": false},
    "inventory": {"create": false, "read": true, "update": false, "delete": false}
}'),
('cashier', 'Cajero', 'Solo creación de facturas y consulta básica', '{
    "invoices": {"create": true, "read": true, "update": false, "delete": false},
    "clients": {"create": false, "read": true, "update": false, "delete": false},
    "products": {"create": false, "read": true, "update": false, "delete": false}
}')
ON CONFLICT (name) DO NOTHING;

-- Función para verificar permisos
CREATE OR REPLACE FUNCTION public.check_user_permission(
    user_uuid UUID,
    module_name TEXT,
    action_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
    role_permissions JSONB;
    module_permissions JSONB;
BEGIN
    -- Obtener permisos del usuario y su rol
    SELECT 
        ur.permissions,
        up.allowed_modules,
        CASE 
            WHEN up.parent_user_id IS NULL THEN '{"all": true}'::jsonb
            ELSE ur.permissions
        END as effective_permissions
    INTO role_permissions, user_permissions, role_permissions
    FROM public.user_profiles up
    LEFT JOIN public.user_roles ur ON up.role_id = ur.id
    WHERE up.user_id = user_uuid
    AND up.is_active = true;
    
    -- Si no hay perfil, denegar acceso
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Si es propietario (sin parent_user_id), permitir todo
    IF user_permissions IS NULL THEN
        RETURN true;
    END IF;
    
    -- Verificar si tiene acceso a todos los módulos
    IF role_permissions ? 'all' AND (role_permissions->>'all')::boolean THEN
        RETURN true;
    END IF;
    
    -- Verificar permisos específicos del módulo
    IF role_permissions ? module_name THEN
        module_permissions := role_permissions->module_name;
        IF module_permissions ? action_name THEN
            RETURN (module_permissions->>action_name)::boolean;
        END IF;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el perfil completo del usuario
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid UUID)
RETURNS TABLE (
    profile_id UUID,
    user_id UUID,
    parent_user_id UUID,
    role_name VARCHAR,
    display_name VARCHAR,
    department VARCHAR,
    job_position VARCHAR,
    permissions JSONB,
    is_owner BOOLEAN,
    allowed_modules JSONB,
    restrictions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.user_id,
        up.parent_user_id,
        ur.name,
        up.display_name,
        up.department,
        up.job_position,
        COALESCE(ur.permissions, '{}'::jsonb),
        (up.parent_user_id IS NULL) as is_owner,
        up.allowed_modules,
        up.restrictions
    FROM public.user_profiles up
    LEFT JOIN public.user_roles ur ON up.role_id = ur.id
    WHERE up.user_id = user_uuid
    AND up.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    owner_role_id UUID;
BEGIN
    -- Obtener ID del rol de propietario
    SELECT id INTO owner_role_id FROM public.user_roles WHERE name = 'owner';
    
    -- Crear perfil de propietario para nuevo usuario
    INSERT INTO public.user_profiles (
        user_id,
        role_id,
        display_name,
        can_create_invoices,
        can_view_finances,
        can_manage_inventory,
        can_manage_clients,
        can_manage_users,
        can_view_reports,
        allowed_modules
    ) VALUES (
        NEW.id,
        owner_role_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        true,
        true,
        true,
        true,
        true,
        true,
        '["all"]'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas RLS para user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Los propietarios pueden ver perfiles de sus empleados
CREATE POLICY "Owners can view employee profiles" ON public.user_profiles
    FOR SELECT USING (auth.uid() = parent_user_id);

-- Los propietarios pueden actualizar perfiles de empleados
CREATE POLICY "Owners can update employee profiles" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = parent_user_id);

-- Los propietarios pueden crear nuevos empleados
CREATE POLICY "Owners can create employee profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = parent_user_id);

-- Políticas para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view roles" ON public.user_roles
    FOR SELECT USING (true);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_parent_user_id ON public.user_profiles(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON public.user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_name ON public.user_roles(name);

-- Comentarios para documentación
COMMENT ON TABLE public.user_roles IS 'Roles del sistema con permisos específicos';
COMMENT ON TABLE public.user_profiles IS 'Perfiles extendidos de usuarios con permisos y restricciones';
COMMENT ON FUNCTION public.check_user_permission IS 'Verifica si un usuario tiene permiso para realizar una acción específica';
COMMENT ON FUNCTION public.get_user_profile IS 'Obtiene el perfil completo de un usuario con sus permisos';