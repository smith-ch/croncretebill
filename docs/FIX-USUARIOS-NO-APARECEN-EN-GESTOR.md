# Solución: Usuarios nuevos no aparecen en el gestor de suscripciones

## 🔍 Problemas Identificados

### Problema 1: Emails faltantes en user_profiles
El trigger `handle_new_user()` que crea perfiles automáticamente cuando se registra un nuevo usuario **NO estaba guardando el email** en la tabla `user_profiles`, por lo que los usuarios nuevos no aparecían en el gestor de suscripciones.

### Problema 2: Error 400 en create_manual_subscription
La función `create_manual_subscription` usaba nombres de columna incorrectos:
- **Usaba**: `sp.max_invoices_per_month` 
- **Debería usar**: `sp.max_invoices`

Esto causaba un error 400 (Bad Request) al intentar crear suscripciones.

## ✅ Solución Implementada

Se han creado varios archivos para solucionar estos problemas:

### Archivos para el Problema 1 (Emails faltantes):

1. **`FIX-MISSING-EMAIL-IN-USER-PROFILES.sql`**
   - Actualiza el trigger para incluir el email al crear nuevos perfiles
   - Actualiza perfiles existentes que no tienen email
   - Crea perfiles faltantes para usuarios que existen en auth.users

2. **`execute-email-fix.js`**
   - Script Node.js que ejecuta el fix automáticamente

### Archivos para el Problema 2 (Error 400):

3. **`FIX-CREATE-MANUAL-SUBSCRIPTION-FUNCTION.sql`**
   - Corrige la función `create_manual_subscription` para usar nombres de columna correctos
   - Cambia `max_invoices_per_month` a `max_invoices`

4. **`execute-function-fix.js`**
   - Script para verificar y probar la función corregida

## 🚀 Cómo Ejecutar los Fixes

### ⚠️ IMPORTANTE: Ejecuta AMBOS fixes en orden

### Fix 1: Emails en user_profiles

#### Opción A: Ejecutar el script Node.js
```bash
cd c:\Users\smith\Desktop\PWA\croncretebill\scripts
node execute-email-fix.js
```

#### Opción B: Ejecutar el SQL manualmente en Supabase
1. Ve a tu proyecto en Supabase: https://app.supabase.com
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `FIX-MISSING-EMAIL-IN-USER-PROFILES.sql`
4. Ejecuta el script (haz clic en "Run")

### Fix 2: Función create_manual_subscription

#### 🔴 OBLIGATORIO: Ejecuta en Supabase SQL Editor

1. Ve a tu proyecto en Supabase: https://app.supabase.com
2. Ve a **SQL Editor**
3. Copia y pega el contenido completo de `FIX-CREATE-MANUAL-SUBSCRIPTION-FUNCTION.sql`
4. Ejecuta el script (haz clic en "Run")
5. Verifica que veas el mensaje: ✅ Función create_manual_subscription actualizada correctamente

**Nota**: Este fix NO puede ejecutarse con el script Node.js porque requiere permisos especiales para modificar funciones SQL.

## 📋 Qué hace el fix

### 1. Actualiza el trigger
Antes:
```sql
INSERT INTO public.user_profiles (
    user_id,
    role_id,
    display_name,
    -- ... otros campos
) VALUES (
    NEW.id,
    owner_role_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ...),
    -- ... otros valores
);
```

Después:
```sql
INSERT INTO public.user_profiles (
    user_id,
    role_id,
    email,  -- ← CAMPO AGREGADO
    display_name,
    -- ... otros campos
) VALUES (
    NEW.id,
    owner_role_id,
    NEW.email,  -- ← VALOR AGREGADO
    COALESCE(NEW.raw_user_meta_data->>'full_name', ...),
    -- ... otros valores
);
```

### 2. Actualiza perfiles existentes
```sql
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.user_id = au.id
AND (up.email IS NULL OR up.email = '');
```

### 3. Crea perfiles faltantes
Para cualquier usuario en `auth.users` que no tenga un perfil en `user_profiles`, se crea uno automáticamente con su email.

## 🎯 Resultado

Después de ejecutar el fix:
- ✅ Todos los usuarios nuevos tendrán su email guardado automáticamente
- ✅ Todos los usuarios existentes tendrán su email actualizado
- ✅ Todos los usuarios aparecerán en el gestor de suscripciones
- ✅ El dropdown de "Seleccionar Usuario" mostrará todos los usuarios con su email

## 🔍 Verificación

Para verificar que el fix funcionó correctamente, puedes ejecutar esta consulta en Supabase SQL Editor:

```sql
-- Ver todos los perfiles con su email
SELECT 
  user_id,
  email,
  display_name,
  CASE WHEN parent_user_id IS NULL THEN 'Owner' ELSE 'Empleado' END as tipo,
  is_active,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- Verificar que no haya perfiles sin email
SELECT COUNT(*) as perfiles_sin_email
FROM user_profiles
WHERE email IS NULL OR email = '';
```

Si el resultado de la segunda consulta es `0`, entonces el fix funcionó correctamente.

## 📝 Notas Importantes

1. **Respaldo**: Aunque este script solo actualiza y no elimina datos, es buena práctica hacer un respaldo antes de ejecutar.

2. **Usuarios futuros**: Con el trigger actualizado, todos los usuarios nuevos que se registren a partir de ahora tendrán su email guardado automáticamente.

3. **Sin impacto en usuarios**: Este fix no afecta a los usuarios existentes, solo asegura que todos los datos estén completos.

4. **Gestor de Suscripciones**: Después del fix, podrás ver todos los usuarios en:
   - `/subscriptions` → Tab "Suscripciones" → Botón "Crear Nueva Suscripción"
   - El dropdown "Seleccionar Usuario" mostrará todos los usuarios con su email

## 🐛 Si aún hay problemas

Si después de ejecutar el fix los usuarios siguen sin aparecer:

1. Verifica que el script se ejecutó sin errores
2. Revisa los logs en la consola del navegador (F12)
3. Verifica en Supabase SQL Editor que los perfiles tienen email:
   ```sql
   SELECT * FROM user_profiles WHERE email IS NOT NULL;
   ```
4. Recarga la página del gestor de suscripciones (Ctrl+F5)

## 📞 Soporte

Si tienes algún problema ejecutando el fix, revisa:
- Los logs del script Node.js
- Los errores en Supabase SQL Editor
- La consola del navegador (F12) en la página de suscripciones
