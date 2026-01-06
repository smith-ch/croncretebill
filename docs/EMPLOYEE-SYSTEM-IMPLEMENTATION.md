# Implementación: Sistema de Empleados Derivados del Owner

Este documento describe los cambios realizados para implementar un sistema donde cada empleado tiene su propia cuenta de usuario (derivada del owner), eliminando la necesidad del "role switcher".

## 🎯 Objetivo

- **Antes:** Un solo usuario (owner) que cambia de rol con un switcher en la UI
- **Después:** Cada empleado tiene su propia cuenta de Supabase, derivada del owner

## 📋 Cambios Realizados

### 1. Base de Datos

#### Script 40: `scripts/40-add-root-owner-to-profiles.sql`
- Agrega columna `root_owner_id` a `user_profiles`
- Crea función `current_root_owner_id()` para obtener el owner raíz del usuario actual
- Popula automáticamente `root_owner_id` para registros existentes

#### Script 41: `scripts/41-add-owner-id-to-tables.sql`
- Agrega columna `owner_id` a todas las tablas principales (clients, projects, products, invoices, etc.)
- Popula `owner_id` basado en `root_owner_id` de los usuarios
- Actualiza políticas RLS para usar `owner_id` en vez de `user_id`
- Ahora empleados y owners comparten los mismos datos de la empresa

#### Scripts Actualizados: 28 y 29
- `scripts/28-fix-employee-creation.sql`: Actualizado para setear `root_owner_id` al crear empleados
- `scripts/29-fix-signup-issues.sql`: Actualizado para incluir `root_owner_id` en invitaciones

### 2. Frontend

#### Nuevo Hook: `hooks/use-user-permissions-db.ts`
- Reemplazo del sistema de role switcher
- Obtiene permisos directamente desde la base de datos
- Basado en `parent_user_id` y `root_owner_id`
- No requiere cambio manual de rol en la UI

## 🚀 Cómo Aplicar los Cambios

### Paso 1: Ejecutar Scripts SQL en Supabase

En el [Dashboard de Supabase](https://supabase.com/dashboard) > SQL Editor:

```sql
-- 1. Agregar root_owner_id a user_profiles
-- Copiar y ejecutar: scripts/40-add-root-owner-to-profiles.sql

-- 2. Agregar owner_id a tablas y actualizar RLS
-- Copiar y ejecutar: scripts/41-add-owner-id-to-tables.sql

-- 3. Re-ejecutar scripts actualizados (opcional, solo si ya tenías empleados)
-- Copiar y ejecutar: scripts/28-fix-employee-creation.sql
-- Copiar y ejecutar: scripts/29-fix-signup-issues.sql
```

### Paso 2: Actualizar el Frontend

#### Opción A: Migración Gradual (Recomendado)

1. Mantener `use-user-permissions-simple.ts` funcionando para compatibilidad
2. Crear nuevas páginas que usen `use-user-permissions-db.ts`
3. Migrar gradualmente cada página

```typescript
// Antes
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'

// Después
import { useUserPermissionsDB } from '@/hooks/use-user-permissions-db'
```

#### Opción B: Migración Total

1. Reemplazar todas las importaciones de `use-user-permissions-simple` por `use-user-permissions-db`
2. Remover el componente `RoleSwitcher`
3. Actualizar queries para usar `rootOwnerId` en vez de `user.id`

### Paso 3: Actualizar Queries de Supabase

**Antes:**
```typescript
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', user.id)
```

**Después:**
```typescript
const { permissions } = useUserPermissionsDB()
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('owner_id', permissions.rootOwnerId)
```

O mejor aún, las políticas RLS ya filtran automáticamente:
```typescript
// RLS se encarga del filtro automáticamente
const { data } = await supabase
  .from('clients')
  .select('*')
```

## 🔑 Conceptos Clave

### Relaciones de Usuarios

```
Owner (user_id: A)
├─ parent_user_id: NULL
├─ root_owner_id: A
└─ Empleado 1 (user_id: B)
   ├─ parent_user_id: A
   ├─ root_owner_id: A
   └─ Empleado 2 (user_id: C)
      ├─ parent_user_id: A
      └─ root_owner_id: A
```

### Datos Compartidos

Todos los registros tienen `owner_id = root_owner_id`:

```
Clientes:
- Cliente X (owner_id: A) → Visible para Owner y todos sus empleados

Facturas:
- Factura Y (owner_id: A) → Visible para Owner y todos sus empleados
```

### Permisos

Los permisos se definen en `user_profiles`:
- `can_create_invoices`: bool
- `can_view_finances`: bool
- `can_manage_inventory`: bool
- `can_manage_clients`: bool

El hook `useUserPermissionsDB` los expone automáticamente.

## 📝 Notas Importantes

1. **Compatibilidad hacia atrás:** Los scripts son seguros de re-ejecutar (usan `IF NOT EXISTS` y `COALESCE`)

2. **Datos existentes:** Se migran automáticamente al ejecutar los scripts

3. **RLS automático:** Una vez aplicados los cambios, las políticas RLS filtran automáticamente por empresa

4. **Sin role switcher:** Los empleados entran directamente con sus cuentas, sin necesidad de cambiar roles

## 🧪 Pruebas

1. **Como Owner:**
   - Crear empleado desde `/settings/employee-config`
   - Verificar que se envía invitación

2. **Como Empleado:**
   - Registrarse con el email invitado
   - Verificar que ve los datos del owner
   - Verificar que no puede acceder a funciones restringidas

3. **Verificar en DB:**
```sql
-- Ver estructura de empleados
SELECT 
  u.email,
  up.parent_user_id,
  up.root_owner_id,
  up.can_create_invoices,
  up.can_view_finances
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
ORDER BY up.parent_user_id NULLS FIRST;

-- Ver datos compartidos
SELECT 
  c.name,
  c.owner_id,
  u.email as owner_email
FROM clients c
JOIN auth.users u ON c.owner_id = u.id;
```

## ✅ Checklist de Implementación

- [x] Script 40: Agregar `root_owner_id`
- [x] Script 41: Agregar `owner_id` y actualizar RLS
- [x] Actualizar scripts 28 y 29
- [x] Crear hook `use-user-permissions-db.ts`
- [ ] Ejecutar scripts en Supabase
- [ ] Migrar páginas al nuevo hook
- [ ] Probar con usuarios owner y empleado
- [ ] Remover `RoleSwitcher` (opcional)

## 🔮 Próximos Pasos (Opcional)

Una vez que este sistema funcione:
- Implementar planes de suscripción con límites de empleados
- Agregar más permisos granulares
- Implementar jerarquías de empleados (sub-managers)
