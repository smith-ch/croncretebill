# 🔧 Configurar Reset Password en Supabase

## ⚠️ Problema Actual
El enlace de "Restablecer Contraseña" muestra el error: **"Enlace inválido o expirado"**

Esto sucede porque la URL de redirección NO está configurada correctamente en Supabase.

---

## ✅ Solución: Configurar URLs en Supabase Dashboard

### Paso 1: Ir a Configuración de Autenticación

1. Abre [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **uhladddzopyimzolwbcb**
3. Ve a **Authentication** (menú lateral izquierdo)
4. Clic en **URL Configuration**

### Paso 2: Configurar Site URL

En el campo **Site URL**, agrega tu URL de producción:

```
https://concretebil.vercel.app
```

### Paso 3: Configurar Redirect URLs

En el campo **Redirect URLs**, agrega TODAS estas URLs (una por línea):

```
https://concretebil.vercel.app/**
https://concretebil.vercel.app/reset-password
http://localhost:3000/**
http://localhost:3000/reset-password
```

**Importante:** El `/**` permite cualquier ruta en ese dominio.

### Paso 4: Guardar Cambios

Haz clic en **Save** al final de la página.

---

## 🔍 Verificar que Funcione

### Opción 1: Desde el Dashboard de Supabase

1. Ve a **Authentication** > **Users**
2. Encuentra tu usuario
3. Haz clic en los 3 puntos (**...**) al lado del usuario
4. Selecciona **Send Reset Password Email**
5. Revisa tu correo y haz clic en el enlace

### Opción 2: Desde la App

1. Ve a la página de login
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu correo
4. Revisa tu correo y haz clic en el enlace

---

## 📧 Verificar Plantilla de Email (Opcional)

Si quieres personalizar el email de reset, ve a:

1. **Authentication** > **Email Templates**
2. Selecciona **Reset Password**
3. Verifica que la URL sea:

```html
{{ .ConfirmationURL }}
```

O más específicamente:

```html
{{ .SiteURL }}/reset-password#access_token={{ .Token }}&type=recovery
```

---

## 🧪 Testing en Desarrollo

Para probar en **localhost**:

1. Asegúrate de que `http://localhost:3000/**` esté en Redirect URLs
2. Solicita el reset desde `http://localhost:3000`
3. El enlace del email debería redirigir a `http://localhost:3000/reset-password#access_token=...`

---

## ⚙️ Configuración Actual del Código

El código actual en `/app/reset-password/page.tsx` espera el token en el **hash** de la URL:

```
https://concretebil.vercel.app/reset-password#access_token=xxx&type=recovery&refresh_token=xxx
```

Esto es el formato **estándar** de Supabase cuando se configura correctamente el `redirectTo`.

---

## 🐛 Debug

Si sigue sin funcionar, abre la consola del navegador (F12) y verás logs como:

```
Hash params: { accessToken: true, type: 'recovery' }
Token válido encontrado en hash
```

O si hay error:

```
No se encontró token válido
```

Esto te ayudará a identificar si el token está llegando correctamente.

---

## 📱 URLs Importantes

- **Producción:** https://concretebil.vercel.app
- **Desarrollo:** http://localhost:3000
- **Reset Password:** `/reset-password`
- **Supabase Project:** uhladddzopyimzolwbcb

---

## ✨ Después de Configurar

Una vez configurado correctamente en Supabase:

1. ✅ Los enlaces de reset funcionarán automáticamente
2. ✅ El usuario será redirigido a `/reset-password` con el token
3. ✅ Podrá cambiar su contraseña sin problemas
4. ✅ Será redirigido al login después del cambio exitoso

---

**¿Necesitas ayuda?** 
- Supabase Docs: https://supabase.com/docs/guides/auth/auth-email
- Verificar logs en: Supabase Dashboard > Logs > Auth Logs
