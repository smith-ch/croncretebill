# 🔴 Error 400: redirect_uri_mismatch - Google OAuth

## ❌ El Error

```
Acceso bloqueado: la solicitud de esta aplicación no es válida
Error 400: redirect_uri_mismatch
```

Este error significa que la URL de callback en **Google Cloud Console** no coincide con la URL que **Supabase** está usando.

---

## ✅ Solución Paso a Paso

### Paso 1: Obtener tu URL de Callback de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** → **API** (en el menú lateral)
3. Busca tu **Project URL**. Se verá algo así:
   ```
   https://abcdefghijklmnop.supabase.co
   ```

4. Tu **URL de Callback** es:
   ```
   https://TU-PROYECTO-ID.supabase.co/auth/v1/callback
   ```

**Ejemplo:**
```
https://xyzabcdef1234567.supabase.co/auth/v1/callback
```

**⚠️ IMPORTANTE:** Copia esta URL exacta, la necesitarás en el siguiente paso.

---

### Paso 2: Agregar la URL en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)

2. Selecciona tu proyecto

3. Ve a **APIs & Services** → **Credentials** (Credenciales)

4. Haz clic en tu **OAuth 2.0 Client ID** (el que creaste para la app)

5. En la sección **Authorized redirect URIs**, haz clic en **+ ADD URI**

6. Pega la URL de callback de Supabase:
   ```
   https://tu-proyecto-id.supabase.co/auth/v1/callback
   ```

7. Haz clic en **SAVE** (Guardar)

---

### Paso 3: Verificar Configuración en Supabase

1. Ve a Supabase Dashboard → **Authentication** → **Providers**

2. Busca **Google** y verifica que:
   - ✅ Esté habilitado (toggle en ON)
   - ✅ Tenga el **Client ID** de Google
   - ✅ Tenga el **Client Secret** de Google

3. Si algo falta, copia las credenciales desde Google Cloud Console:
   - En Google Console → Credentials → Tu OAuth Client
   - Copia el **Client ID**
   - Copia el **Client Secret**
   - Pégalos en Supabase

---

## 🎯 Checklist de Verificación

Antes de probar nuevamente, verifica:

- [ ] La URL de callback en Google Console es **exactamente**: `https://[proyecto].supabase.co/auth/v1/callback`
- [ ] No hay espacios al inicio o final de la URL
- [ ] Usas `https://` (no `http://`)
- [ ] El ID del proyecto en la URL es correcto
- [ ] Incluye `/auth/v1/callback` al final
- [ ] Guardaste los cambios en Google Console
- [ ] Las credenciales en Supabase son correctas

---

## 📸 Visual Guide

### En Google Cloud Console debería verse así:

```
Authorized redirect URIs:
┌─────────────────────────────────────────────────────┐
│ https://xyzabc123.supabase.co/auth/v1/callback     │
└─────────────────────────────────────────────────────┘
```

### URLs que NO funcionan:

❌ `http://xyzabc123.supabase.co/auth/v1/callback` (http en lugar de https)
❌ `https://xyzabc123.supabase.co/auth/callback` (falta /v1/)
❌ `https://xyzabc123.supabase.co/` (falta la ruta completa)
❌ `localhost:3000/auth/callback` (esto es diferente, para desarrollo local)

---

## 🔍 Cómo Obtener tu Project ID de Supabase

**Opción 1: Desde la URL del Dashboard**
- Cuando estás en tu proyecto, la URL es:
  ```
  https://app.supabase.com/project/[ESTE-ES-TU-ID]
  ```

**Opción 2: Desde Settings**
1. Ve a Settings → API
2. Tu Project URL completa está ahí
3. El ID es la primera parte: `https://[ID-AQUÍ].supabase.co`

**Opción 3: Desde Authentication**
1. Ve a Authentication → Providers
2. Haz clic en Google
3. Allí verás la "Callback URL" que debes usar

---

## 🔄 Después de Configurar

1. **Espera 1-2 minutos** para que Google propague los cambios

2. **Prueba nuevamente:**
   - Ve a tu aplicación
   - Haz clic en el botón "Google"
   - Deberías ver la pantalla de selección de cuenta de Google
   - Selecciona tu cuenta
   - ¡Deberías ingresar exitosamente!

---

## ⚠️ Si Todavía No Funciona

### Error persiste después de configurar:

1. **Verifica que guardaste** en Google Console (botón SAVE)

2. **Espera 2-3 minutos** para que los cambios se propaguen

3. **Cierra y abre** la ventana de autenticación

4. **Limpia caché del navegador:**
   - Ctrl + Shift + Delete
   - Selecciona "Cookies y datos de sitios"
   - Limpia y vuelve a intentar

5. **Verifica en la consola del navegador:**
   - F12 → Console
   - Mira si hay algún error adicional
   - Copia el mensaje de error completo

---

## 📱 Múltiples URLs (Opcional)

Si necesitas que funcione en **desarrollo local** Y en **producción**, agrega ambas URLs:

```
Authorized redirect URIs:
┌─────────────────────────────────────────────────────┐
│ https://tu-proyecto.supabase.co/auth/v1/callback   │
│ http://localhost:3000/auth/v1/callback             │
│ http://192.168.100.4:3000/auth/v1/callback         │
└─────────────────────────────────────────────────────┘
```

**Pero para OAuth de Google/Facebook, siempre se usa la URL de Supabase como intermediario.**

---

## 🎉 ¿Funcionó?

Una vez que agregues la URL correcta en Google Console y esperes 1-2 minutos, el error debería desaparecer.

Si ves la pantalla de selección de cuenta de Google, ¡lo lograste! 🚀

---

## 📞 Necesitas Ayuda Adicional

Si el error persiste, provee:
- Tu Project URL de Supabase (Settings → API)
- La URL exacta que pusiste en Google Console
- Screenshot del error completo
- Screenshot de la configuración en Google Console
