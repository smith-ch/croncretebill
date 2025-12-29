# Configuración de OAuth para Google y Facebook en Supabase

Este documento explica cómo configurar la autenticación OAuth con Google y Facebook en tu proyecto de Supabase.

## 🔐 Configuración en Supabase Dashboard

### 1. Acceder a la configuración de Authentication

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a `Authentication` → `Providers`
3. Busca los proveedores que deseas habilitar (Google y Facebook)

---

## 🔵 Configuración de Google OAuth

### Paso 1: Crear aplicación en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google+ API**:
   - Ve a `APIs & Services` → `Library`
   - Busca "Google+ API" y haz clic en "Enable"

### Paso 2: Crear credenciales OAuth 2.0

1. Ve a `APIs & Services` → `Credentials`
2. Haz clic en `Create Credentials` → `OAuth client ID`
3. Si es necesario, configura la pantalla de consentimiento OAuth:
   - Ve a `OAuth consent screen`
   - Tipo de usuario: External (para desarrollo) o Internal (si es G Suite)
   - Completa la información requerida:
     - Nombre de la aplicación: "ConcreteBill"
     - Correo de soporte
     - Logo de la aplicación (opcional)
     - Dominios autorizados

4. Vuelve a `Credentials` y crea el OAuth client ID:
   - Tipo de aplicación: `Web application`
   - Nombre: "ConcreteBill Web"
   - **Authorized redirect URIs**: Agrega la URL de Supabase:
     ```
     https://[TU-PROYECTO].supabase.co/auth/v1/callback
     ```
     Reemplaza `[TU-PROYECTO]` con el ID de tu proyecto en Supabase

5. Guarda el **Client ID** y **Client Secret**

### Paso 3: Configurar en Supabase

1. En Supabase Dashboard, ve a `Authentication` → `Providers`
2. Busca **Google** y habilítalo
3. Ingresa:
   - **Client ID** (de Google)
   - **Client Secret** (de Google)
4. Guarda los cambios

---

## 🔷 Configuración de Facebook OAuth

### Paso 1: Crear aplicación en Facebook Developers

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Haz clic en `My Apps` → `Create App`
3. Selecciona el tipo de aplicación:
   - Tipo: `Consumer` o `Business` (según tu caso)
4. Completa la información:
   - Nombre de la aplicación: "ConcreteBill"
   - Email de contacto
   - Selecciona un propósito de negocio

### Paso 2: Configurar Facebook Login

1. En el dashboard de tu aplicación, ve a `Add a Product`
2. Busca **Facebook Login** y haz clic en `Set Up`
3. Selecciona `Web` como plataforma
4. Ingresa la URL de tu sitio (puede ser temporal):
   ```
   https://tu-dominio.com
   ```

### Paso 3: Configurar OAuth Redirect URIs

1. Ve a `Facebook Login` → `Settings`
2. En **Valid OAuth Redirect URIs**, agrega:
   ```
   https://[TU-PROYECTO].supabase.co/auth/v1/callback
   ```
   Reemplaza `[TU-PROYECTO]` con el ID de tu proyecto en Supabase
3. Guarda los cambios

### Paso 4: Obtener credenciales

1. Ve a `Settings` → `Basic`
2. Copia el **App ID** y **App Secret**
3. Si la aplicación está en modo desarrollo, asegúrate de:
   - Agregar usuarios de prueba en `Roles` → `Test Users`
   - O cambiar la aplicación a modo "Live" (requiere revisión de Facebook)

### Paso 5: Configurar en Supabase

1. En Supabase Dashboard, ve a `Authentication` → `Providers`
2. Busca **Facebook** y habilítalo
3. Ingresa:
   - **Facebook client ID** (App ID de Facebook)
   - **Facebook secret** (App Secret de Facebook)
4. Guarda los cambios

---

## ⚙️ Configuración adicional de Facebook

### Para modo producción (Opcional pero recomendado)

1. En Facebook Developers, ve a `Settings` → `Basic`
2. Completa todos los campos requeridos:
   - Privacy Policy URL
   - Terms of Service URL
   - App Icon
   - Category
3. Ve a `App Review` y solicita permisos adicionales si es necesario:
   - `email` (usualmente aprobado automáticamente)
   - `public_profile` (básico)
4. Cambia la aplicación a modo "Live"

---

## 🧪 Pruebas

### Probar Google OAuth

1. Ve a tu aplicación en desarrollo
2. Haz clic en el botón "Google"
3. Deberías ver la pantalla de consentimiento de Google
4. Selecciona una cuenta y autoriza
5. Serás redirigido de vuelta a tu aplicación

### Probar Facebook OAuth

1. Ve a tu aplicación en desarrollo
2. Haz clic en el botón "Facebook"
3. Deberías ver la pantalla de login de Facebook
4. Si la app está en modo desarrollo, solo usuarios de prueba pueden iniciar sesión
5. Autoriza la aplicación
6. Serás redirigido de vuelta a tu aplicación

---

## 🔧 Troubleshooting

### Errores comunes con Google

1. **"redirect_uri_mismatch"**
   - Verifica que la URL de callback en Google Console coincida exactamente con la de Supabase
   - Formato: `https://[proyecto].supabase.co/auth/v1/callback`

2. **"Access blocked: This app's request is invalid"**
   - Asegúrate de haber configurado la OAuth consent screen
   - Verifica que el email de soporte sea válido

### Errores comunes con Facebook

1. **"Can't Load URL: The domain of this URL isn't included in the app's domains"**
   - Agrega tu dominio en `Settings` → `Basic` → `App Domains`
   - Agrega la URL de callback en `Facebook Login` → `Settings` → `Valid OAuth Redirect URIs`

2. **"App Not Set Up: This app is still in development mode"**
   - Agrega tu cuenta de prueba en `Roles` → `Test Users`
   - O cambia la aplicación a modo "Live"

3. **"Given URL is not allowed by the Application configuration"**
   - Verifica la URL de callback en Facebook Login Settings
   - Debe ser: `https://[proyecto].supabase.co/auth/v1/callback`

---

## 📝 URLs de Callback Importantes

Guarda estas URLs para referencia rápida:

- **Google Console**: https://console.cloud.google.com/
- **Facebook Developers**: https://developers.facebook.com/
- **Supabase Dashboard**: https://app.supabase.com/
- **Callback URL**: `https://[TU-PROYECTO].supabase.co/auth/v1/callback`

Reemplaza `[TU-PROYECTO]` con el ID de tu proyecto que aparece en la URL de Supabase.

---

## ✅ Verificación

Para verificar que todo está configurado correctamente:

1. ✅ Google OAuth habilitado en Supabase
2. ✅ Facebook OAuth habilitado en Supabase
3. ✅ Client ID y Secret configurados correctamente
4. ✅ URLs de callback agregadas en ambas consolas
5. ✅ Botones de Google y Facebook funcionando en la aplicación
6. ✅ Redirección al dashboard después del login exitoso

---

## 🎯 Próximos pasos

Después de configurar OAuth:

1. Prueba el flujo completo de autenticación
2. Verifica que los usuarios se creen correctamente en la base de datos
3. Asegúrate de que el perfil del usuario se cree automáticamente
4. Configura los permisos y roles según sea necesario
5. Considera agregar más proveedores OAuth si es necesario (GitHub, Twitter, etc.)

---

## 📚 Recursos adicionales

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/)
