# 🔐 Sistema de Gestión de Suscripciones - ConcreteBill

## 📋 Descripción General

Sistema completo para gestionar suscripciones de usuarios de forma manual en la primera etapa del proyecto. Permite al administrador de suscripciones gestionar planes, activar/desactivar cuentas, y llevar un historial completo de cambios.

## 👤 Usuario Administrador

**Email:** `smithrodriguez345@gmail.com`

Este usuario tiene el rol especial de **Subscription Manager** con permisos completos para:
- ✅ Ver todas las suscripciones de usuarios
- ✅ Crear nuevas suscripciones manualmente
- ✅ Modificar estados de suscripciones
- ✅ Gestionar planes de suscripción
- ✅ Ver historial completo de cambios
- ✅ Acceso a reportes de suscripciones

## 🗄️ Estructura de Base de Datos

### 1. **subscription_plans** - Planes de Suscripción

Tabla que define los diferentes planes disponibles:

```sql
- free: Plan Gratuito ($0/mes)
  * 1 usuario
  * 50 facturas/mes
  * 100 productos
  * 50 clientes
  * 1 GB almacenamiento

- starter: Plan Starter ($500/mes)
  * 3 usuarios
  * 500 facturas/mes
  * 500 productos
  * 200 clientes
  * 5 GB almacenamiento

- professional: Plan Profesional ($1,500/mes)
  * 10 usuarios
  * 2,000 facturas/mes
  * 2,000 productos
  * 1,000 clientes
  * 20 GB almacenamiento
  * Gestión de empleados
  * Reportes avanzados

- enterprise: Plan Empresarial ($5,000/mes)
  * Usuarios ilimitados
  * Facturas ilimitadas
  * Todo ilimitado
  * Soporte dedicado
  * API access
  * Integraciones personalizadas
```

### 2. **user_subscriptions** - Suscripciones Activas

Tabla que almacena las suscripciones de cada usuario:

**Campos principales:**
- `user_id`: Usuario suscrito
- `plan_id`: Plan asignado
- `status`: Estado (active, trial, inactive, expired, cancelled, suspended)
- `billing_cycle`: Ciclo de facturación (monthly, yearly, lifetime, custom)
- `start_date`: Fecha de inicio
- `end_date`: Fecha de expiración
- `managed_by`: Usuario que gestiona la suscripción
- `notes`: Notas del administrador
- Límites actuales y contadores de uso

### 3. **subscription_history** - Historial de Cambios

Registro completo de todos los cambios realizados en las suscripciones:

**Acciones registradas:**
- created: Suscripción creada
- activated: Suscripción activada
- renewed: Suscripción renovada
- upgraded: Cambio a plan superior
- downgraded: Cambio a plan inferior
- cancelled: Suscripción cancelada
- suspended: Suscripción suspendida
- expired: Suscripción expirada

## 🛠️ Funciones SQL Disponibles

### 1. Asignar Rol de Subscription Manager

```sql
SELECT assign_subscription_manager_role('smithrodriguez345@gmail.com');
```

### 2. Crear Suscripción Manual

```sql
SELECT create_manual_subscription(
  'usuario@example.com',      -- Email del usuario
  'professional',              -- Nombre del plan
  NOW(),                       -- Fecha de inicio
  NOW() + INTERVAL '1 year',  -- Fecha de fin
  'active',                    -- Estado
  'yearly',                    -- Ciclo de facturación
  'smithrodriguez345@gmail.com', -- Manager
  'Suscripción inicial'        -- Notas
);
```

### 3. Actualizar Estado de Suscripción

```sql
SELECT update_subscription_status(
  'usuario@example.com',       -- Email del usuario
  'suspended',                 -- Nuevo estado
  'Pago pendiente',            -- Razón del cambio
  'smithrodriguez345@gmail.com' -- Manager
);
```

### 4. Verificar si Usuario es Subscription Manager

```sql
SELECT is_subscription_manager('user-uuid-here');
```

## 🖥️ Interfaz Web

### Acceso al Panel

1. Iniciar sesión con el usuario `smithrodriguez345@gmail.com`
2. En el menú lateral, ir a **Configuración → 🔐 Suscripciones**
3. La entrada solo es visible para usuarios con rol subscription_manager

### Características del Panel

#### 📊 **Pestaña Suscripciones**

- **Lista completa de suscripciones:** Ver todas las suscripciones activas e inactivas
- **Crear nueva suscripción:** Botón para asignar suscripción manual
- **Editar suscripción:** Cambiar estado y agregar notas
- **Información detallada:**
  - Email del usuario
  - Plan asignado
  - Estado actual (con badges coloridos)
  - Ciclo de facturación
  - Fechas de inicio y fin
  - Uso actual vs. límites

#### 📦 **Pestaña Planes**

- **Visualización de planes:** Cards con información de cada plan
- **Información mostrada:**
  - Nombre y descripción
  - Precio mensual y anual
  - Límites de usuarios, facturas, productos, clientes
  - Features habilitadas
  - Estado activo/inactivo

#### 📜 **Pestaña Historial**

- **Registro completo de cambios:** Todos los cambios realizados
- **Información mostrada:**
  - Fecha y hora del cambio
  - Acción realizada
  - Estado anterior y nuevo
  - Usuario que realizó el cambio
  - Razón del cambio

### Crear Nueva Suscripción

1. Click en botón **"Nueva Suscripción"**
2. Completar formulario:
   - **Email del usuario:** Email del usuario a suscribir
   - **Plan:** Seleccionar plan del dropdown
   - **Estado:** Active o Trial
   - **Ciclo de facturación:** Mensual o Anual
   - **Fecha de expiración:** (Opcional) Si se deja vacío, sin límite
   - **Notas:** Notas adicionales sobre la suscripción
3. Click en **"Crear Suscripción"**

### Editar Suscripción Existente

1. Click en botón **Editar** (ícono de lápiz) en la fila de la suscripción
2. Modificar:
   - **Nuevo estado:** Seleccionar nuevo estado
   - **Razón del cambio:** Explicar por qué se cambia
3. Click en **"Actualizar"**

## 🔒 Seguridad y Permisos

### Row Level Security (RLS)

El sistema tiene políticas RLS implementadas:

**subscription_plans:**
- Subscription managers pueden ver y gestionar todos los planes

**user_subscriptions:**
- Usuarios solo pueden ver su propia suscripción
- Subscription managers pueden ver y gestionar todas las suscripciones

**subscription_history:**
- Usuarios solo pueden ver su propio historial
- Subscription managers pueden ver todo el historial

### Rol subscription_manager

Permisos asignados:
```json
{
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
}
```

## 📥 Instalación

### 1. Ejecutar Script SQL

Ejecutar el archivo SQL en Supabase:

```bash
scripts/50-subscription-management-system.sql
```

Este script:
- ✅ Crea las 3 tablas principales
- ✅ Agrega el rol subscription_manager
- ✅ Asigna el rol al usuario smithrodriguez345@gmail.com
- ✅ Crea 4 planes predefinidos (free, starter, professional, enterprise)
- ✅ Configura todas las funciones SQL
- ✅ Establece las políticas RLS
- ✅ Configura triggers para historial automático

### 2. Verificar Instalación

Después de ejecutar el script, verificar en la consola de Supabase:

```sql
-- Verificar que el rol fue creado
SELECT * FROM user_roles WHERE name = 'subscription_manager';

-- Verificar que el usuario tiene el rol
SELECT 
  au.email,
  up.display_name,
  ur.name as role
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
JOIN user_roles ur ON ur.id = up.role_id
WHERE au.email = 'smithrodriguez345@gmail.com';

-- Verificar planes creados
SELECT name, display_name, price_monthly FROM subscription_plans;
```

## 🚀 Uso del Sistema

### Flujo Típico - Nuevo Usuario

1. Usuario se registra en el sistema
2. Subscription manager recibe notificación
3. Manager accede al panel de suscripciones
4. Crea suscripción manual para el usuario
5. Selecciona plan apropiado (ej: trial por 30 días)
6. Usuario puede acceder con las funcionalidades del plan

### Flujo Típico - Renovación

1. Suscripción cerca de expirar
2. Manager revisa pagos/acuerdos
3. Actualiza fecha de fin de suscripción
4. O cambia estado si no se renovó

### Flujo Típico - Cambio de Plan

1. Usuario solicita upgrade/downgrade
2. Manager accede a la suscripción
3. Crea nueva suscripción con el nuevo plan
4. El sistema registra el cambio en el historial

### Flujo Típico - Suspensión

1. Usuario tiene pago pendiente o incumplimiento
2. Manager actualiza estado a 'suspended'
3. Agrega razón del cambio
4. El usuario pierde acceso según el plan

## 📊 Reportes y Análisis

El sistema registra automáticamente en el historial:

- **Todas las suscripciones creadas**
- **Cambios de estado**
- **Cambios de plan**
- **Usuario que realizó cada cambio**
- **Fecha y hora exacta**
- **Razón del cambio**

Esto permite generar reportes de:
- Ingresos mensuales/anuales
- Tasa de conversión trial → paid
- Churn rate (cancelaciones)
- Planes más populares
- Actividad del subscription manager

## 🔧 Mantenimiento

### Agregar Nuevo Plan

```sql
INSERT INTO subscription_plans (
  name, display_name, description,
  price_monthly, price_yearly,
  max_users, max_invoices_per_month,
  features, is_active
) VALUES (
  'custom_plan',
  'Plan Personalizado',
  'Plan adaptado a necesidades específicas',
  2500.00, 25000.00,
  5, 1000,
  '{"custom_feature": true}'::jsonb,
  true
);
```

### Desactivar Plan

```sql
UPDATE subscription_plans
SET is_active = false
WHERE name = 'plan_name';
```

### Ver Suscripciones por Plan

```sql
SELECT 
  sp.display_name as plan,
  COUNT(*) as total_subscribers,
  COUNT(CASE WHEN us.status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN us.status = 'trial' THEN 1 END) as trial
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
GROUP BY sp.display_name
ORDER BY total_subscribers DESC;
```

## 🐛 Troubleshooting

### El usuario no ve la opción de Suscripciones en el menú

**Solución:**
```sql
-- Verificar que tiene el rol correcto
SELECT assign_subscription_manager_role('smithrodriguez345@gmail.com');

-- Limpiar caché del navegador y hacer logout/login
```

### Error al crear suscripción: "Usuario no encontrado"

**Causa:** El email no existe en auth.users

**Solución:** Verificar que el usuario esté registrado en el sistema primero

### No se registran cambios en el historial

**Causa:** Trigger no ejecutándose

**Solución:**
```sql
-- Verificar que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'log_user_subscription_changes';

-- Recrear si es necesario ejecutando el script nuevamente
```

## 📝 Notas Importantes

1. **Primera Etapa:** Este es un sistema de gestión MANUAL. En una segunda etapa se puede integrar:
   - Pagos automáticos (Stripe, PayPal, etc.)
   - Auto-renovación
   - Notificaciones automáticas
   - Portal de autoservicio para usuarios

2. **Seguridad:** El usuario smithrodriguez345@gmail.com tiene acceso total. Proteger esta cuenta con:
   - Contraseña fuerte
   - 2FA activado
   - Monitoreo de actividad

3. **Escalabilidad:** El sistema está diseñado para soportar miles de suscripciones. Las tablas tienen índices optimizados.

4. **Auditoría:** TODOS los cambios quedan registrados. No se puede eliminar historial para mantener trazabilidad completa.

## 📞 Soporte

Para problemas o preguntas sobre el sistema de suscripciones, contactar al equipo de desarrollo.

---

**Versión:** 1.0.0  
**Fecha:** Enero 2026  
**Autor:** Sistema ConcreteBill
