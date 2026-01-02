-- Policy para que empleados puedan leer su propio perfil
-- Sin esto, el login falla porque no pueden verificar sus permisos

-- Eliminar política existente si hay conflicto
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

-- Crear política que permite a usuarios leer su propio perfil
CREATE POLICY "Users can read own profile" 
ON user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para que owners puedan leer perfiles de sus empleados
DROP POLICY IF EXISTS "Owners can read employee profiles" ON user_profiles;

CREATE POLICY "Owners can read employee profiles"
ON user_profiles
FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.uid() = parent_user_id OR
  auth.uid() = root_owner_id
);

-- Asegurar que RLS está habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
