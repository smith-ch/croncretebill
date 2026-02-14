# 🔧 Solución Error 500 en Login de Empleados

## 🔍 Problema
Los empleados no pueden iniciar sesión y reciben error 500:
```
POST https://uhladddzopyimzolwbcb.supabase.co/auth/v1/token?grant_type=password 500 (Internal Server Error)
```

## 📋 Causas Comunes

El error 500 en el login de empleados puede ser causado por:

1. **Tokens inválidos**: `confirmation_token` o `recovery_token` con strings vacíos `''` en lugar de `NULL`
2. **instance_id incorrecto**: `NULL` o `00000000-0000-0000-0000-000000000000`
3. **Email no confirmado**: `email_confirmed_at` es `NULL`
4. **Contraseña malformada**: `encrypted_password` vacío o con formato incorrecto
5. **Campos aud/role incorrectos**: No están en `'authenticated'`
6. **Usuario bloqueado o eliminado**: `banned_until` o `deleted_at` tienen valores

## 🛠️ Solución Paso a Paso

### Paso 1: Ejecutar Diagnóstico Completo

Ve al **SQL Editor** de Supabase:
```
https://uhladddzopyimzolwbcb.supabase.co/project/_/sql/new
```

Ejecuta estos 2 scripts en orden:

#### 1.1. Diagnóstico General
```bash
# Archivo: scripts/141-diagnose-and-fix-employee-login-500.sql
```

Copia todo el contenido del archivo `141-diagnose-and-fix-employee-login-500.sql` y pégalo en el SQL Editor.

#### 1.2. Verificación de Contraseñas
```bash
# Archivo: scripts/142-verify-employee-passwords.sql
```

Copia todo el contenido del archivo `142-verify-employee-passwords.sql` y pégalo en el SQL Editor.

### Paso 2: Analizar los Resultados

El script mostrará algo como:

```
⚠️  PROBLEMA: confirmation_token es string vacío (debe ser NULL)
⚠️  PROBLEMA: instance_id incorrecto: 00000000-0000-0000-0000-000000000000
⚠️  PROBLEMA: email no confirmado (email_confirmed_at es NULL)
✅ encrypted_password parece correcto
```

### Paso 3: Aplicar Reparaciones Automáticas

El script `141-diagnose-and-fix-employee-login-500.sql` tiene 2 partes:
- **PARTE 1**: Diagnóstico (solo lectura)
- **PARTE 2**: Reparación (modifica datos)

Ambas partes se ejecutan automáticamente cuando pegas el script completo.

La reparación corregirá:
- ✅ instance_id
- ✅ confirmation_token → NULL
- ✅ recovery_token → NULL
- ✅ email_confirmed_at → NOW()
- ✅ aud → 'authenticated'
- ✅ role → 'authenticated'

### Paso 4: Verificar Contraseñas (Si Aplica)

Si el script `142` detecta problemas de contraseña:

#### Opción A: Resetear Contraseña como Owner

Usa la función creada por el script:

```sql
-- Como owner, ejecuta:
SELECT reset_employee_password(
  'employee_user_id'::uuid,  -- ID del empleado
  'nuevaContraseña123'        -- Nueva contraseña
);
```

#### Opción B: Que el Empleado Use "Olvidé mi Contraseña"

El empleado puede usar el flujo de recuperación de contraseña desde el login.

#### Opción C: Recrear el Empleado

Si todo falla, elimina y recrea al empleado:

```sql
-- 1. Eliminar empleado
DELETE FROM public.user_profiles WHERE user_id = 'employee_id';
DELETE FROM auth.users WHERE id = 'employee_id';

-- 2. Recrear con create_employee_direct()
SELECT create_employee_direct(
  'email@example.com',     -- email
  'Password123',           -- contraseña
  'Nombre Empleado',       -- nombre
  'owner_user_id'::uuid,   -- tu ID de owner
  true,                    -- can_create_invoices
  false,                   -- can_view_finances
  true,                    -- can_manage_inventory
  true                     -- can_manage_clients
);
```

## 🔍 Verificación Final

Después de aplicar las reparaciones:

1. **Prueba el login** del empleado
2. Si aún falla, revisa los **logs de Supabase**:
   - Ve a: Dashboard > Authentication > Logs
   - Busca el intento de login reciente
   - Revisa el mensaje de error específico

3. **Verifica el trigger `handle_new_user`**:
   ```sql
   -- Ver triggers activos
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   
   -- Ver la función
   \df public.handle_new_user
   ```

## 🚨 Problemas Adicionales

### Error: "User already registered"
El empleado ya existe pero no puede iniciar sesión.

**Solución**: Ejecutar la reparación del script 141.

### Error: "Invalid login credentials"
La contraseña está incorrecta o mal encriptada.

**Solución**: Resetear la contraseña con `reset_employee_password()`.

### Error: "Email not confirmed"
El email no está confirmado.

**Solución**: La reparación del script 141 lo corrige automáticamente.

### Error persiste después de todas las reparaciones

Si después de todo el empleado sigue sin poder entrar:

1. **Verifica en Supabase Dashboard > Authentication**:
   - ¿Aparece el empleado en la lista de usuarios?
   - ¿Está el email confirmado?
   - ¿Hay alguna restricción o bloqueo?

2. **Revisa las políticas RLS**:
   ```sql
   -- Ver políticas de user_profiles
   SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
   ```

3. **Contacta soporte de Supabase**:
   Si el problema persiste, puede ser un issue del lado de Supabase Auth.

## 📝 Notas Importantes

- ⚠️ Estos scripts modifican la tabla `auth.users` que es gestionada por Supabase
- ✅ Todas las operaciones están diseñadas para ser seguras
- ⚠️ Haz backup antes de ejecutar en producción
- ✅ Los scripts incluyen manejo de errores y rollback automático

## 📊 Empleados Actuales

Según el último diagnóstico:

- **test0@gmail.com** (chepi) - Inactivo
- **smith_18r@test.com** (ds) - Activo

## 🔗 Archivos Relacionados

- `scripts/141-diagnose-and-fix-employee-login-500.sql` - Diagnóstico y reparación general
- `scripts/142-verify-employee-passwords.sql` - Verificación de contraseñas
- `scripts/140-fix-create-employee-direct-auth-fields.sql` - Prevención para nuevos empleados
- `scripts/run-fix-employee-login.js` - Script Node.js auxiliar

## ✅ Checklist de Verificación

Antes de declarar que está resuelto:

- [ ] Script 141 ejecutado sin errores
- [ ] Script 142 ejecutado sin errores
- [ ] Empleado puede iniciar sesión exitosamente
- [ ] Dashboard muestra que el empleado está activo
- [ ] No hay errores 500 en la consola del navegador
- [ ] El empleado puede acceder a su dashboard

---

**Última actualización**: 13 de febrero de 2026
