# 🔧 Solución: Error de URL en Reset Password (localhost rechazado)

## ❌ Problema

Cuando recibes el correo de recuperación de contraseña y haces clic en el enlace, aparece el error:
```
localhost rechazó la conexión
ERR_CONNECTION_REFUSED
```

Esto sucede porque:
1. El enlace del correo apunta a `localhost:3000`
2. Localhost solo funciona en la misma computadora donde corre el servidor
3. No funciona en dispositivos móviles o en otros dispositivos

---

## ✅ Solución Rápida (Configurar Supabase)

### Paso 1: Configurar Site URL en Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Authentication** → **URL Configuration**
3. En **Site URL**, configura la URL principal de tu aplicación:

   **Para desarrollo local en tu red:**
   ```
   http://TU-IP-LOCAL:3000
   ```
   Por ejemplo: `http://192.168.1.10:3000`

   **Para producción:**
   ```
   https://tu-dominio.com
   ```

### Paso 2: Agregar URLs adicionales permitidas

En el mismo panel (**Authentication** → **URL Configuration**):

1. En **Redirect URLs**, agrega todas las URLs que necesites:
   ```
   http://localhost:3000/**
   http://192.168.1.10:3000/**
   https://tu-dominio.com/**
   https://tu-app.vercel.app/**
   ```

2. Asegúrate de incluir `/**` al final para permitir todas las rutas

---

## 🔍 Cómo Obtener tu IP Local

### En Windows:
1. Abre PowerShell o CMD
2. Ejecuta:
   ```powershell
   ipconfig
   ```
3. Busca "IPv4 Address" bajo tu conexión activa
4. Será algo como: `192.168.1.10` o `192.168.0.15`

### En macOS/Linux:
```bash
ifconfig
```
o
```bash
hostname -I
```

---

## 📱 Acceder desde tu Móvil

Una vez que tengas tu IP local:

1. Asegúrate de que tu computadora y móvil estén en la misma red WiFi
2. Inicia tu aplicación en desarrollo:
   ```bash
   npm run dev
   ```
3. En tu móvil, abre el navegador y ve a:
   ```
   http://TU-IP-LOCAL:3000
   ```

**Ejemplo:**
```
http://192.168.1.10:3000
```

---

## ⚙️ Configuración Avanzada (Opcional)

### Opción 1: Usar Variable de Entorno

Puedes crear un archivo `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://192.168.1.10:3000
```

Y modificar el código para usar esta variable (ya está implementado el código con `window.location.origin`).

### Opción 2: Usar ngrok para URL pública temporal

Si necesitas una URL pública temporal:

1. Instala ngrok: https://ngrok.com/download
2. Ejecuta:
   ```bash
   ngrok http 3000
   ```
3. Usa la URL que te da ngrok (ej: `https://abc123.ngrok.io`)
4. Configúrala en Supabase como Site URL

---

## 🔄 Proceso Correcto de Reset Password

### Después de configurar correctamente:

1. **Usuario solicita reset:**
   - Va a tu app (en la IP correcta)
   - Hace clic en "¿Olvidaste tu contraseña?"
   - Ingresa su email

2. **Supabase envía correo:**
   - El correo contiene un enlace con la URL configurada
   - Ejemplo: `http://192.168.1.10:3000/reset-password?token=...`

3. **Usuario hace clic en el enlace:**
   - Se abre la página de reset password
   - Puede ingresar nueva contraseña
   - Se redirige al dashboard

---

## 🧪 Verificar Configuración

### Test 1: Verificar Site URL
1. Ve a Supabase Dashboard
2. Authentication → URL Configuration
3. Verifica que Site URL sea accesible desde tu dispositivo

### Test 2: Probar Reset Password
1. Desde tu móvil, ve a la app usando la IP local
2. Solicita reset password con tu email
3. Revisa el correo en tu móvil
4. Haz clic en el enlace
5. Debe abrir la página de reset password (no localhost)

---

## 🎯 Configuración por Entorno

### Desarrollo Local (computadora):
```
Site URL: http://localhost:3000
Redirect URLs: 
  - http://localhost:3000/**
```

### Desarrollo Local (móvil en misma red):
```
Site URL: http://192.168.1.10:3000
Redirect URLs: 
  - http://localhost:3000/**
  - http://192.168.1.10:3000/**
```

### Producción:
```
Site URL: https://tu-dominio.com
Redirect URLs: 
  - https://tu-dominio.com/**
  - https://www.tu-dominio.com/**
```

---

## ⚠️ Notas Importantes

1. **IP Local cambia:** Tu IP local puede cambiar si reinicias el router. Verifica con `ipconfig`.

2. **Firewall:** Asegúrate de que tu firewall de Windows permita conexiones en el puerto 3000.

3. **Misma Red:** Tu móvil y computadora deben estar en la misma red WiFi.

4. **Producción:** En producción, usa siempre HTTPS y tu dominio real.

5. **Multiple URLs:** Puedes agregar múltiples URLs en Supabase para desarrollo y producción.

---

## 🚀 Solución Inmediata

**Si necesitas probar AHORA mismo:**

1. Obtén tu IP local: `ipconfig` en PowerShell
2. Ve a Supabase Dashboard → Authentication → URL Configuration
3. Cambia Site URL a: `http://TU-IP-LOCAL:3000`
4. Agrega en Redirect URLs: `http://TU-IP-LOCAL:3000/**`
5. Guarda cambios
6. Vuelve a solicitar reset password
7. El nuevo correo tendrá la URL correcta

---

## 📞 ¿Todavía no funciona?

Verifica:
- [ ] Site URL está configurado correctamente en Supabase
- [ ] Redirect URLs incluyen tu URL con `/**`
- [ ] Tu móvil está en la misma red WiFi
- [ ] Puedes acceder a `http://TU-IP:3000` desde el navegador del móvil
- [ ] El firewall permite conexiones en puerto 3000
- [ ] El correo que recibiste tiene la URL correcta (no localhost)

Si el correo antiguo tiene localhost, solicita un nuevo reset password después de cambiar la configuración.
