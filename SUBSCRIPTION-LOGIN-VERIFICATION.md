# Sistema de Verificación de Suscripción en Login

## 📋 Descripción General

Este documento describe cómo funciona la verificación automática de suscripciones durante el proceso de login y cómo se manejan los usuarios sin suscripción activa.

## 🔐 Flujo de Autenticación con Verificación

### 1. Login con Email/Password

Cuando un usuario intenta iniciar sesión con email y contraseña:

```typescript
// En components/auth/modern-auth-form.tsx - handleSignIn()

1. Usuario ingresa credenciales
2. Se verifica con Supabase Auth
3. Si las credenciales son válidas:
   a. Se consulta la tabla user_subscriptions
   b. Se verifica el estado de la suscripción
   c. Si NO tiene suscripción o está inactiva:
      - Se cierra la sesión inmediatamente
      - Se muestra mensaje de error
      - El usuario permanece en pantalla de login
   d. Si tiene suscripción activa:
      - Se permite el acceso
      - Si expira en menos de 7 días, se muestra advertencia
```

### 2. Login con OAuth (Google/Facebook)

Para autenticación OAuth, la verificación se realiza en dos lugares:

```typescript
// En app/client-layout.tsx - checkSubscription()

1. Usuario se autentica con proveedor OAuth
2. Al recibir el callback:
   a. Se ejecuta checkSubscription() automáticamente
   b. Si no tiene suscripción activa:
      - Se cierra la sesión
      - Se muestra mensaje de error
   c. Si tiene suscripción activa:
      - Se permite el acceso al dashboard
```

## 📊 Panel de Gestión de Suscripciones

### Visualización de Todos los Usuarios

El panel `/subscriptions` ahora muestra:

- ✅ **Usuarios con suscripción activa**
- ⚠️ **Usuarios con suscripción inactiva/expirada**
- ❌ **Usuarios SIN suscripción** (aparecen como "Sin Plan")

```sql
-- La consulta combina:
1. Todos los usuarios de user_profiles
2. Sus suscripciones (si existen) de user_subscriptions
3. Información del plan de subscription_plans

-- Usuarios sin suscripción aparecen como:
{
  id: 'no-sub-{user_id}',
  user_id: 'uuid',
  plan_id: null,
  status: 'inactive',
  user_email: 'email@example.com',
  plan_name: 'Ninguno',
  plan_display_name: 'Sin Plan',
  notes: 'Sin suscripción'
}
```

## 🚫 Estados de Suscripción

### Estados Posibles

| Estado | Descripción | Acceso Permitido |
|--------|-------------|------------------|
| `active` | Suscripción activa y vigente | ✅ Sí |
| `trial` | Período de prueba activo | ✅ Sí |
| `expired` | Suscripción expirada | ❌ No |
| `cancelled` | Suscripción cancelada | ❌ No |
| `suspended` | Suscripción suspendida | ❌ No |
| `null` (sin suscripción) | Usuario sin plan asignado | ❌ No |

## 💬 Mensajes al Usuario

### Sin Suscripción

```
❌ No tienes una suscripción activa.
Contacta al administrador para activar tu cuenta.
```

### Suscripción Expirada

```
❌ Tu suscripción está expirada.
Contacta al administrador para renovarla.
```

### Suscripción Inactiva/Suspendida

```
❌ Tu suscripción está inactiva.
Contacta al administrador para renovarla.
```

### Advertencia de Expiración Próxima

```
⚠️ Tu suscripción [Plan Name] expira en X día(s).
Contacta al administrador para renovarla.
```

## 🛠️ Implementación Técnica

### Archivos Modificados

1. **app/subscriptions/page.tsx**
   - Modificado `loadData()` para mostrar TODOS los usuarios
   - Combina `user_profiles` con `user_subscriptions`
   - Muestra usuarios sin suscripción como "Sin Plan"

2. **components/auth/modern-auth-form.tsx**
   - Añadido `handleSignIn()` con verificación de suscripción
   - Cierra sesión automáticamente si no hay suscripción activa
   - Muestra advertencias de expiración

3. **app/client-layout.tsx**
   - Añadida función `checkSubscription()`
   - Verifica suscripción al cargar sesión inicial
   - Verifica suscripción en evento `SIGNED_IN`
   - Muestra mensaje de error persistente si no hay suscripción

### Funciones SQL Útiles

```sql
-- Verificar suscripción de un usuario
SELECT 
  us.status,
  us.end_date,
  sp.display_name as plan_name,
  CASE 
    WHEN us.status = 'active' THEN 'Acceso Permitido'
    ELSE 'Acceso Denegado'
  END as access_status
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'USER_UUID';

-- Ver todos los usuarios sin suscripción
SELECT 
  up.user_id,
  up.email,
  up.display_name
FROM user_profiles up
LEFT JOIN user_subscriptions us ON up.user_id = us.user_id
WHERE us.id IS NULL
ORDER BY up.created_at DESC;

-- Ver usuarios con suscripción expirada
SELECT 
  up.email,
  us.status,
  us.end_date,
  sp.display_name as plan
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status IN ('expired', 'cancelled', 'suspended')
ORDER BY us.end_date DESC;
```

## 👤 Gestión Manual de Suscripciones

### Crear Suscripción para Nuevo Usuario

1. Usuario manager accede a `/subscriptions`
2. Ve la lista completa de usuarios (con y sin suscripción)
3. Usuarios sin suscripción aparecen con estado "Sin Plan"
4. Click en "Nueva Suscripción"
5. Selecciona usuario, plan, fechas
6. Guarda y la suscripción se activa inmediatamente

### Activar Usuario sin Acceso

Si un usuario reporta que no puede acceder:

```sql
-- 1. Verificar su estado actual
SELECT * FROM user_subscriptions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- 2. Si no tiene suscripción, crearla:
SELECT create_manual_subscription(
  (SELECT id FROM auth.users WHERE email = 'user@example.com'),
  (SELECT id FROM subscription_plans WHERE name = 'starter'),
  NOW(),
  NOW() + INTERVAL '1 month',
  (SELECT id FROM auth.users WHERE email = 'smithrodriguez345@gmail.com'),
  'Activación inicial del usuario'
);

-- 3. Si tiene suscripción inactiva, activarla:
SELECT update_subscription_status(
  (SELECT id FROM user_subscriptions WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')),
  'active',
  (SELECT id FROM auth.users WHERE email = 'smithrodriguez345@gmail.com'),
  'Reactivación por solicitud del cliente'
);
```

## 🔄 Casos de Uso

### Caso 1: Usuario Nuevo Registrado

```
1. Usuario se registra en el sistema (OAuth o Email)
2. Se crea cuenta en auth.users
3. Se crea perfil en user_profiles
4. NO se crea suscripción automáticamente
5. Usuario intenta hacer login → ERROR
6. Manager ve al usuario en panel de suscripciones como "Sin Plan"
7. Manager crea suscripción manualmente
8. Usuario ahora puede hacer login exitosamente
```

### Caso 2: Suscripción Expirada

```
1. Usuario con suscripción activa
2. Llega end_date de la suscripción
3. Estado cambia a 'expired' automáticamente
4. Usuario intenta hacer login → ERROR
5. Manager ve status 'expired' en panel
6. Manager renueva suscripción (nueva end_date + status 'active')
7. Usuario puede hacer login nuevamente
```

### Caso 3: Advertencia Próxima Expiración

```
1. Usuario tiene suscripción activa
2. end_date es en menos de 7 días
3. Usuario hace login → ÉXITO
4. Aparece mensaje de advertencia en pantalla
5. Usuario puede seguir trabajando normalmente
6. Manager puede renovar antes de expiración
```

## 📧 Usuario Manager Principal

```
Email: smithrodriguez345@gmail.com
Rol: subscription_manager
Permisos:
  - Ver TODOS los usuarios (con y sin suscripción)
  - Crear nuevas suscripciones
  - Modificar suscripciones existentes
  - Activar/Desactivar suscripciones
  - Ver historial completo de cambios
  - Acceder a reportes de suscripciones
```

## 🎯 Próximos Pasos Recomendados

1. **Notificaciones por Email**
   - Enviar email cuando suscripción está por expirar
   - Notificar a usuario cuando se activa/desactiva su cuenta
   - Notificar a manager cuando se registra nuevo usuario

2. **Dashboard de Métricas**
   - Total de usuarios activos vs inactivos
   - Ingresos mensuales por suscripciones
   - Tasa de renovación
   - Usuarios en riesgo de cancelación

3. **Portal de Auto-Servicio**
   - Permitir que usuarios vean su estado de suscripción
   - Solicitar upgrade/downgrade de plan
   - Ver historial de pagos

4. **Automatización**
   - Script para marcar como 'expired' suscripciones vencidas
   - Recordatorios automáticos antes de expiración
   - Suspensión automática después de X días de expiración

## 🔍 Troubleshooting

### Usuario no puede hacer login

```sql
-- Verificar:
1. ¿El usuario existe?
SELECT * FROM auth.users WHERE email = 'user@example.com';

2. ¿Tiene perfil?
SELECT * FROM user_profiles WHERE user_id = 'USER_UUID';

3. ¿Tiene suscripción?
SELECT * FROM user_subscriptions WHERE user_id = 'USER_UUID';

4. ¿La suscripción está activa?
SELECT status, end_date FROM user_subscriptions WHERE user_id = 'USER_UUID';
```

### Manager no ve usuarios sin suscripción

```sql
-- Verificar que la consulta incluya LEFT JOIN
-- Debe devolver usuarios incluso sin registros en user_subscriptions
SELECT 
  up.user_id,
  up.email,
  COALESCE(us.status, 'no_subscription') as status
FROM user_profiles up
LEFT JOIN user_subscriptions us ON up.user_id = us.user_id;
```

## 📝 Notas Importantes

- ⚠️ La verificación ocurre DESPUÉS de autenticación exitosa
- ⚠️ Si no hay suscripción, la sesión se cierra inmediatamente
- ⚠️ Usuarios con status 'trial' SÍ pueden acceder
- ⚠️ Solo status 'active' y 'trial' permiten acceso
- ✅ **IMPORTANTE**: Usuarios con rol `subscription_manager` (smithrodriguez345@gmail.com) **SIEMPRE** tienen acceso, sin importar si tienen suscripción o su estado
- ✅ La verificación de `subscription_manager` se hace con la función `is_subscription_manager()` RPC
- ✅ Esto permite que el administrador gestione el sistema incluso sin tener una suscripción propia

## 🔒 Seguridad

- Las políticas RLS siguen activas
- Usuarios solo ven su propia suscripción
- Manager ve todas las suscripciones
- Verificación en cliente Y en servidor
- No se puede bypasear con developer tools
