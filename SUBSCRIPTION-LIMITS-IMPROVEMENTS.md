# Sistema de Limitaciones Mejorado - Planes de Suscripción

**Fecha**: 2026-01-05  
**Cambios implementados**: Sistema completo de limitaciones por plan con Plan Gratuito restrictivo y mejoras en todos los planes

## 📋 Resumen de Cambios

### 1. Planes Actualizados (SQL)

#### **Plan Gratuito** (MUY LIMITADO)
- 💵 Precio: $0
- 👥 Usuarios: **1**
- 📄 Facturas: **5/mes** (incluye facturas + recibos térmicos)
- 📦 Productos/Servicios: **10**
- 👤 Clientes: **5**
- ❌ **SIN ACCESO A**:
  - Reportes DGII
  - Reportes mensuales
  - Agenda y gastos fijos
  - Proyectos
  - Gastos
  - Vehículos
  - Conductores
  - Notas de entrega
- ⚠️ Marca de agua en reportes

#### **Plan Starter** (MEJORADO)
- 💵 Precio: $499/mes
- 👥 Usuarios: **3** (antes: 1) ⬆️ +200%
- 📄 Facturas: **100/mes** (antes: 50) ⬆️ +100%
- 📦 Productos/Servicios: **100** (antes: 50) ⬆️ +100%
- 👤 Clientes: **50** (antes: 25) ⬆️ +100%
- ✅ Acceso a todos los módulos básicos

#### **Plan Professional** (MEJORADO)
- 💵 Precio: $999/mes
- 👥 Usuarios: **5** (antes: 3) ⬆️ +67%
- 📄 Facturas: **1,000/mes** (antes: 500) ⬆️ +100%
- 📦 Productos/Servicios: **1,000** (antes: 500) ⬆️ +100%
- 👤 Clientes: **500** (antes: 200) ⬆️ +150%
- ✅ Reportes DGII completos
- ✅ Acceso a todos los módulos

#### **Plan Business** (MEJORADO)
- 💵 Precio: $1,999/mes
- 👥 Usuarios: **15** (antes: 10) ⬆️ +50%
- 📄 Facturas: **5,000/mes** (antes: 2,000) ⬆️ +150%
- 📦 Productos/Servicios: **5,000** (antes: 2,000) ⬆️ +150%
- 👤 Clientes: **2,500** (antes: 1,000) ⬆️ +150%
- ✅ API Access
- ✅ Soporte 24/7

#### **Plan Enterprise** (MEJORADO)
- 💵 Precio: $3,999/mes
- 👥 Usuarios: **100** (antes: 50) ⬆️ +100%
- 📄 Facturas: **20,000/mes** (antes: 10,000) ⬆️ +100%
- 📦 Productos/Servicios: **20,000** (antes: 10,000) ⬆️ +100%
- 👤 Clientes: **10,000** (antes: 5,000) ⬆️ +100%
- ✅ Multi-sucursales
- ✅ Soporte premium 24/7
- ✅ Capacitación personalizada

---

## 🔧 Archivos Modificados

### Scripts SQL

#### `scripts/53-add-free-plan.sql`
- ✅ Plan Gratuito con límites super restrictivos (5, 10, 5)
- ✅ Trigger `on_user_created_assign_free_plan`
- ✅ Función `assign_free_plan_to_new_user()`
- ✅ Asignación automática a nuevos usuarios

#### `scripts/50-setup-subscription-plans.sql`
- ✅ Actualización de todos los planes con nuevos límites
- ✅ Features actualizadas en cada plan
- ✅ Descripciones mejoradas con información de acceso

### Hooks

#### **`hooks/use-subscription-limits.ts`** ⚠️ CAMBIO IMPORTANTE
**Líneas 80-133**: Contador de facturas actualizado
```typescript
// Ahora cuenta facturas + recibos térmicos juntos
const { count: invoicesCount } = await supabase
  .from('invoices')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', monthStart.toISOString())

const { count: thermalReceiptsCount } = await supabase
  .from('thermal_receipts')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', monthStart.toISOString())

// Total combinado
const totalInvoices = (invoicesCount || 0) + (thermalReceiptsCount || 0)
```

#### **`hooks/use-plan-access.ts`** 🆕 NUEVO ARCHIVO
Hook completo para verificar acceso a páginas restringidas:

**Funciones disponibles:**
- `hasAccessToAdvancedFeatures()` - Verifica acceso general
- `hasAccessToDGIIReports()` - Reportes DGII
- `hasAccessToMonthlyReports()` - Reportes mensuales
- `hasAccessToAgenda()` - Agenda/Gastos fijos
- `hasAccessToProjects()` - Proyectos
- `hasAccessToExpenses()` - Gastos
- `hasAccessToVehicles()` - Vehículos
- `hasAccessToDrivers()` - Conductores
- `hasAccessToDeliveryNotes()` - Notas de entrega
- `requireAccess(featureName, hasAccess)` - Redirige si no tiene acceso

**Uso en páginas:**
```typescript
const { hasAccessToXXX, requireAccess, isLoading: planLoading } = usePlanAccess()

useEffect(() => {
  if (!planLoading) {
    requireAccess('Módulo de XXX', hasAccessToXXX())
  }
}, [planLoading, hasAccessToXXX])
```

### Páginas con Restricción de Acceso

Todas estas páginas ahora verifican el plan antes de permitir acceso:

1. ✅ **`app/dgii-reports/page.tsx`**
   - Requiere: Plan Starter o superior
   - Toast: "Acceso Restringido - Reportes DGII"

2. ✅ **`app/monthly-reports/page.tsx`**
   - Requiere: Plan Starter o superior
   - Toast: "Acceso Restringido - Reportes Mensuales"

3. ✅ **`app/agenda/page.tsx`**
   - Requiere: Plan Starter o superior
   - Toast: "Acceso Restringido - Agenda y Gastos Fijos"

4. ✅ **`app/projects/page.tsx`**
   - Requiere: Plan Starter o superior
   - Toast: "Acceso Restringido - Proyectos"

5. ✅ **`app/expenses/page.tsx`**
   - Requiere: Plan Starter o superior
   - Toast: "Acceso Restringido - Gastos"

6. ✅ **`app/vehicles/page.tsx`**
   - Requiere: Plan Starter o superior
   - Toast: "Acceso Restringido - Vehículos"

7. ✅ **`app/drivers/page.tsx`**
   - Requiere: Plan Starter o superior
   - Toast: "Acceso Restringido - Conductores"

8. ✅ **`app/delivery-notes/page.tsx`**
   - Requiere: Plan Starter o superior
   - Toast: "Acceso Restringido - Notas de Entrega"

### Componentes

#### **`components/auth/modern-auth-form.tsx`**
**Líneas 1270-1360**: Sidebar de registro actualizado con nuevos límites

**Cambios visuales:**
- Starter: "100 facturas/mes, 3 Usuarios, 100 Productos, 50 Clientes"
- Professional: "1,000 facturas/mes, 5 Usuarios, 1,000 Productos, 500 Clientes"
- Business: "5,000 facturas/mes, 15 Usuarios, 5,000 Productos"
- Enterprise: "20,000 facturas/mes, 100 Usuarios, 20,000 Productos"

### UI/UX

#### **`app/subscriptions/my-subscription/page.tsx`**
✅ Los límites se muestran dinámicamente desde la base de datos
✅ Widget de uso ya funciona correctamente con los nuevos límites
✅ Alertas y badges actualizados automáticamente

---

## 🚀 Instrucciones de Implementación

### Paso 1: Ejecutar Scripts SQL

En **Supabase SQL Editor**, ejecutar en orden:

```sql
-- 1. Actualizar planes existentes
\i scripts/50-setup-subscription-plans.sql

-- 2. Crear plan gratuito y trigger
\i scripts/53-add-free-plan.sql
```

### Paso 2: Verificar la Base de Datos

```sql
-- Ver todos los planes
SELECT name, display_name, max_users, max_invoices, max_products, max_clients, price_monthly
FROM subscription_plans
ORDER BY price_monthly;

-- Verificar trigger
SELECT tgname, tgtype, proname 
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'on_user_created_assign_free_plan';
```

### Paso 3: Probar el Sistema

#### Prueba 1: Nuevo Usuario
1. Registrar nuevo usuario
2. Verificar que se asigne Plan Gratuito automáticamente
3. Confirmar límites: 1 usuario, 5 facturas, 10 productos, 5 clientes

#### Prueba 2: Restricciones de Acceso
1. Iniciar sesión con Plan Gratuito
2. Intentar acceder a `/dgii-reports`
3. Debe mostrar toast y redirigir a `/dashboard`
4. Repetir con `/monthly-reports`, `/agenda`, `/projects`, etc.

#### Prueba 3: Límites de Facturas
1. Crear 3 facturas normales
2. Crear 2 recibos térmicos
3. Intentar crear factura #6 → debe bloquearse
4. Widget en My Subscription debe mostrar: 5/5

#### Prueba 4: Upgrade de Plan
1. Cambiar a Plan Starter
2. Verificar nuevos límites: 3 usuarios, 100 facturas
3. Confirmar acceso a páginas restringidas

---

## 📊 Comparativa de Planes

| Recurso | Gratuito | Starter | Professional | Business | Enterprise |
|---------|----------|---------|--------------|----------|------------|
| **Usuarios** | 1 | 3 | 5 | 15 | 100 |
| **Facturas/mes** | 5 | 100 | 1,000 | 5,000 | 20,000 |
| **Productos** | 10 | 100 | 1,000 | 5,000 | 20,000 |
| **Clientes** | 5 | 50 | 500 | 2,500 | 10,000 |
| **Reportes DGII** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Reportes Mensuales** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Agenda** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Proyectos** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Gastos** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Vehículos** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Multi-sucursales** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## ⚠️ Notas Importantes

### Conteo de Facturas
- **IMPORTANTE**: Las facturas ahora se cuentan **combinadas** (invoices + thermal_receipts)
- El límite `max_invoices` aplica al total de ambas tablas
- Ejemplo: Plan Starter (100 facturas) = 50 facturas + 50 recibos térmicos

### Restricciones del Plan Gratuito
- **Sin acceso** a 8 módulos principales
- Solo funcionalidades básicas: Dashboard, Facturas (5), Productos (10), Clientes (5), Recibos de Pago
- Marca de agua en reportes (pendiente de implementar)

### Usuarios vs Empleados
- El conteo de "usuarios" se refiere a **empleados** (`profiles` con `parent_user_id`)
- El dueño principal no cuenta en el límite

### Servicios
- Los servicios **comparten** el límite con productos (`max_products`)
- Ejemplo: 100 productos = puedes tener 50 productos + 50 servicios

---

## 🔜 Pendiente de Implementar

1. **Marca de Agua en Reportes**
   - Agregar watermark a PDFs del Plan Gratuito
   - Remover en planes de pago

2. **Widget en Dashboard**
   - Mostrar resumen de uso en página principal
   - Solo alertas críticas

3. **Notificaciones por Email**
   - Alerta al 80% de límite
   - Alerta al 100% de límite

4. **RLS en Base de Datos**
   - Validación server-side de límites
   - Políticas en Supabase para seguridad adicional

---

## 📝 Resumen Ejecutivo

✅ **Plan Gratuito**: Ahora es MUY limitado (5/10/5) con acceso solo a funcionalidades básicas  
✅ **Plan Starter**: MEJORADO significativamente (3 usuarios, 100 facturas, acceso completo)  
✅ **Planes superiores**: Escalados proporcionalmente con mejoras del 50-150%  
✅ **Conteo de facturas**: Ahora incluye recibos térmicos  
✅ **Restricciones de acceso**: 8 páginas bloqueadas para Plan Gratuito  
✅ **Hook nuevo**: `use-plan-access.ts` para verificación centralizada  
✅ **UI actualizada**: Formulario de registro y página de suscripción  

**Resultado**: Sistema de monetización robusto que incentiva upgrades mientras mantiene funcionalidad básica gratuita.
