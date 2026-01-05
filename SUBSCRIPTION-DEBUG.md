# 🐛 Debug: Verificación de Suscripción

## Problema Reportado
Usuario `smithrodriguez345@gmail.com` recibe mensaje: "No tienes una suscripción activa"

## ✅ Pasos de Verificación

### 1. Verificar que el Script SQL fue Ejecutado

Abre **Supabase Dashboard → SQL Editor** y ejecuta:

```sql
-- 1. Verificar que existe el rol subscription_manager
SELECT * FROM user_roles WHERE name = 'subscription_manager';

-- 2. Verificar que el usuario existe
SELECT id, email FROM auth.users WHERE email = 'smithrodriguez345@gmail.com';

-- 3. Verificar que el usuario tiene el rol asignado
SELECT 
  up.user_id,
  up.email,
  up.role_id,
  ur.name as role_name,
  up.is_active
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'smithrodriguez345@gmail.com';

-- 4. Verificar que la función is_subscription_manager funciona
SELECT is_subscription_manager(
  (SELECT id FROM auth.users WHERE email = 'smithrodriguez345@gmail.com')
);
-- ⚠️ Debe devolver: true
```

### 2. Si el Script NO fue Ejecutado

Ejecuta en **Supabase SQL Editor**:

```sql
-- Ejecutar el script completo
-- Archivo: scripts/50-subscription-management-system.sql
```

### 3. Si el Usuario NO Tiene el Rol

Ejecuta en **Supabase SQL Editor**:

```sql
-- Asignar el rol manualmente
SELECT assign_subscription_manager_role('smithrodriguez345@gmail.com');
```

### 4. Verificación en la Consola del Navegador

Abre la **Consola del Navegador** (F12) y ejecuta:

```javascript
// 1. Obtener usuario actual
const { data: { user } } = await supabase.auth.getUser()
console.log('Usuario actual:', user)

// 2. Verificar si es subscription_manager
const { data: isManager, error } = await supabase.rpc('is_subscription_manager', { 
  p_user_id: user.id 
})
console.log('Es subscription_manager:', isManager)
console.log('Error:', error)

// 3. Ver perfil completo
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*, role:role_id(*)')
  .eq('user_id', user.id)
  .single()
console.log('Perfil:', profile)
```

### 5. Soluciones Rápidas

#### Solución A: Asignar Rol Directamente en SQL

```sql
-- Obtener IDs necesarios
DO $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
BEGIN
  -- Obtener user_id
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'smithrodriguez345@gmail.com';
  
  -- Obtener role_id
  SELECT id INTO v_role_id FROM user_roles WHERE name = 'subscription_manager';
  
  -- Actualizar o insertar en user_profiles
  INSERT INTO user_profiles (user_id, email, role_id, is_active)
  VALUES (v_user_id, 'smithrodriguez345@gmail.com', v_role_id, true)
  ON CONFLICT (user_id) DO UPDATE 
  SET role_id = v_role_id, is_active = true;
  
  RAISE NOTICE 'Rol asignado correctamente a smithrodriguez345@gmail.com';
END $$;
```

#### Solución B: Bypass Temporal (Solo para Testing)

Si necesitas acceso inmediato mientras investigas, modifica temporalmente:

**client-layout.tsx** - Línea ~41:
```typescript
// TEMPORAL: Hardcode para testing
const checkSubscription = async (userId: string) => {
  try {
    // Obtener email del usuario
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', userId)
      .single()
    
    // Bypass para el admin
    if (profile?.email === 'smithrodriguez345@gmail.com') {
      console.log('✅ Admin user - bypass subscription check')
      setSubscriptionError(null)
      return true
    }
    
    // Resto del código...
```

⚠️ **IMPORTANTE**: Esto es solo para debug, remueve después de resolver el problema.

## 📊 Checklist de Diagnóstico

- [ ] Script SQL fue ejecutado en Supabase
- [ ] Rol `subscription_manager` existe en `user_roles`
- [ ] Usuario existe en `auth.users`
- [ ] Usuario tiene perfil en `user_profiles`
- [ ] Perfil tiene `role_id` del rol `subscription_manager`
- [ ] Perfil tiene `is_active = true`
- [ ] Función `is_subscription_manager()` devuelve `true`
- [ ] Función tiene permisos `GRANT EXECUTE`
- [ ] No hay errores en consola del navegador
- [ ] Logs muestran `isManager = true`

## 🔍 Logs Esperados en Consola

Cuando el sistema funciona correctamente, deberías ver:

```
🔍 Login - Checking subscription_manager: {
  userId: "uuid-aqui",
  isManager: true,
  managerError: null
}
✅ Usuario es subscription_manager - acceso garantizado
```

## 🚨 Errores Comunes

### Error: "function is_subscription_manager does not exist"
**Causa**: Script SQL no ejecutado
**Solución**: Ejecutar `scripts/50-subscription-management-system.sql`

### Error: isManager = false (pero debería ser true)
**Causa**: Usuario no tiene rol asignado
**Solución**: Ejecutar `assign_subscription_manager_role('smithrodriguez345@gmail.com')`

### Error: isManager = null
**Causa**: Función no tiene permisos o error en la query
**Solución**: 
```sql
GRANT EXECUTE ON FUNCTION is_subscription_manager(UUID) TO authenticated;
```

### Error: "permission denied for function is_subscription_manager"
**Causa**: RLS o permisos mal configurados
**Solución**:
```sql
ALTER FUNCTION is_subscription_manager(UUID) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION is_subscription_manager(UUID) TO authenticated;
```

## 📞 Si Nada Funciona

1. Verifica en Supabase Dashboard → Authentication → Users que el usuario existe
2. Verifica en Table Editor → user_profiles que el usuario tiene un registro
3. Ejecuta el script SQL completo de nuevo
4. Limpia caché del navegador (Ctrl + Shift + Delete)
5. Cierra sesión y vuelve a iniciar sesión
6. Revisa logs en Supabase Dashboard → Logs
