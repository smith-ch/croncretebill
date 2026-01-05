# 🔧 Solución: Error de Relación entre user_subscriptions y subscription_plans

## ❌ Error Detectado
```
PGRST200: "Could not find a relationship between 'user_subscriptions' and 'subscription_plans' in the schema cache"
```

## 🎯 Causa
La foreign key entre `user_subscriptions.plan_id` y `subscription_plans.id` no está correctamente configurada o el schema cache de Supabase necesita refrescarse.

## ✅ Solución - Ejecutar en Orden

### Paso 1: Ejecutar Scripts en Supabase SQL Editor

**IMPORTANTE: Ejecutar en este orden exacto:**

```sql
-- 1. Crear/actualizar tabla de planes
\i scripts/50-setup-subscription-plans.sql

-- 2. Crear plan gratuito y trigger
\i scripts/53-add-free-plan.sql

-- 3. Corregir relación y refrescar schema cache
\i scripts/54-fix-subscription-relationship.sql
```

### Paso 2: Verificar en Supabase Dashboard

1. Ir a **Database** → **Tables** → `user_subscriptions`
2. Verificar que existe la columna `plan_id` (tipo UUID)
3. Ir a **Relationships** y confirmar que existe:
   - Tabla: `user_subscriptions`
   - Columna: `plan_id`
   - Referencias: `subscription_plans.id`

### Paso 3: Refrescar Schema Cache Manualmente

Si el error persiste después de ejecutar los scripts, ejecutar:

```sql
-- Forzar recarga del schema cache
NOTIFY pgrst, 'reload schema';
```

O reiniciar la API en Supabase Dashboard:
- Settings → API → Restart API Server

### Paso 4: Verificar la Relación

Ejecutar esta query para confirmar:

```sql
-- Verificar foreign key
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_subscriptions'
  AND kcu.column_name = 'plan_id';
```

**Resultado esperado:**
```
constraint_name                      | table_name          | column_name | foreign_table_name   | foreign_column_name
-------------------------------------|---------------------|-------------|----------------------|--------------------
user_subscriptions_plan_id_fkey      | user_subscriptions  | plan_id     | subscription_plans   | id
```

### Paso 5: Verificar Datos

```sql
-- Ver suscripciones con sus planes
SELECT 
  us.id,
  sp.name as plan_name,
  sp.display_name,
  us.current_max_users,
  us.current_max_invoices,
  us.status
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
LIMIT 5;
```

Todas las suscripciones deben mostrar un `plan_name` válido.

## 🔄 Si el Problema Persiste

### Opción A: Recrear la Foreign Key Manualmente

```sql
BEGIN;

-- 1. Eliminar constraint existente
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;

-- 2. Asegurar que plan_id no sea NULL
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'free' LIMIT 1)
WHERE plan_id IS NULL;

-- 3. Crear constraint
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_plan_id_fkey
FOREIGN KEY (plan_id) 
REFERENCES subscription_plans(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 4. Refrescar cache
NOTIFY pgrst, 'reload schema';

COMMIT;
```

### Opción B: Verificar RLS Policies

```sql
-- Ver policies de subscription_plans
SELECT * FROM pg_policies WHERE tablename = 'subscription_plans';

-- Ver policies de user_subscriptions  
SELECT * FROM pg_policies WHERE tablename = 'user_subscriptions';
```

Asegurarse de que exista la policy:
```sql
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);
```

## 🧪 Probar la Aplicación

Después de ejecutar los scripts:

1. **Cerrar sesión** en la aplicación
2. **Limpiar caché del navegador** (Ctrl+Shift+Delete)
3. **Iniciar sesión nuevamente**
4. Ir a `/subscriptions/my-subscription`
5. Debe mostrar la suscripción correctamente

## 📊 Comandos de Diagnóstico

```sql
-- 1. Ver estructura de user_subscriptions
\d user_subscriptions

-- 2. Ver todas las foreign keys
SELECT
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('user_subscriptions', 'subscription_plans')
  AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Contar registros
SELECT 'subscription_plans' as table_name, COUNT(*) FROM subscription_plans
UNION ALL
SELECT 'user_subscriptions', COUNT(*) FROM user_subscriptions;

-- 4. Ver suscripciones sin plan
SELECT COUNT(*) as subscriptions_without_plan
FROM user_subscriptions 
WHERE plan_id IS NULL;
```

## ⚠️ Notas Importantes

1. **El orden de ejecución es crucial**: Primero crear `subscription_plans`, luego agregar la foreign key
2. **Schema cache**: Supabase cachea las relaciones, necesita refrescarse después de cambios DDL
3. **RLS**: Las policies deben permitir SELECT en `subscription_plans` para que la relación funcione
4. **Índices**: El índice en `plan_id` mejora el rendimiento de las queries con JOIN

## ✅ Resultado Final

Después de ejecutar todos los pasos, la aplicación debe:
- ✅ Cargar la página de suscripción sin errores
- ✅ Mostrar el nombre del plan actual
- ✅ Mostrar los límites correctos
- ✅ Widget de uso funcionando
- ✅ Sin errores en la consola del navegador
