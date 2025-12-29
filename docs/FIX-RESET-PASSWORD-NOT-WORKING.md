# 🔧 Solución: Reset Password No Funciona

## ❌ Problemas Comunes

Si la funcionalidad de restablecer contraseña no funciona, puede ser por:
1. Configuración incorrecta de Site URL en Supabase
2. Email templates no configurados
3. Provider de Email no habilitado
4. El correo llega a spam
5. El enlace expira muy rápido

---

## ✅ Soluciones Paso a Paso

### 1. Verificar Configuración de Email en Supabase

**Ve a Supabase Dashboard:**
1. Abre: https://app.supabase.com/project/uhladddzopyimzolwbcb
2. Ve a **Authentication** → **Providers** → **Email**
3. Verifica que:
   - ✅ **Enable Email provider** esté ON
   - ✅ **Confirm email** puedes dejarlo como prefieras
   - ✅ **Enable email confirmations** revisa tu preferencia

---

### 2. Configurar Site URL Correctamente

**Ve a Authentication → URL Configuration:**

**Para desarrollo con móvil en red local:**
```
Site URL: http://192.168.100.4:3000
```

**Para producción:**
```
Site URL: https://tu-dominio.com
```

**Redirect URLs - Agrega ambas:**
```
http://localhost:3000/**
http://192.168.100.4:3000/**
https://uhladddzopyimzolwbcb.supabase.co/**
```

---

### 3. Verificar Email Templates

**Ve a Authentication → Email Templates:**

1. Selecciona **"Reset Password"** (Confirm signup)
2. Verifica que el contenido tenga:
   ```html
   {{ .ConfirmationURL }}
   ```
   O
   ```html
   {{ .SiteURL }}/reset-password?token={{ .Token }}
   ```

3. Si el template está vacío o mal configurado, usa este:

```html
<h2>Restablecer Contraseña</h2>
<p>Has solicitado restablecer tu contraseña.</p>
<p>Haz clic en el siguiente enlace para continuar:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer mi contraseña</a></p>
<p>Si no solicitaste esto, ignora este correo.</p>
<p>Este enlace expirará en 24 horas.</p>
```

---

### 4. Probar la Funcionalidad

#### Test 1: Verificar que el correo se envía
1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Haz clic en "¿Olvidaste tu contraseña?"
4. Ingresa tu email
5. Haz clic en "Enviar"
6. Busca en la consola:
   ```
   Reset password success: ...
   ```
   Si ves un error, cópialo

#### Test 2: Verificar el correo
1. Revisa tu bandeja de entrada
2. **IMPORTANTE:** Revisa también la carpeta de **SPAM**
3. Busca un correo de Supabase
4. Haz clic en el enlace del correo

#### Test 3: Verificar la página de reset
1. Al hacer clic en el enlace del correo
2. Debes ser redirigido a: `tu-url/reset-password`
3. Debes ver un formulario para ingresar nueva contraseña
4. Ingresa y confirma tu nueva contraseña
5. Haz clic en "Actualizar Contraseña"
6. Deberías ser redirigido al dashboard

---

### 5. Configurar SMTP Personalizado (Opcional pero Recomendado)

Si los correos no llegan o van a spam, configura tu propio SMTP:

**Ve a Project Settings → Auth → SMTP Settings:**

**Ejemplo con Gmail:**
```
Enable Custom SMTP: ON
Sender email: tu-email@gmail.com
Sender name: ConcreteBill

Host: smtp.gmail.com
Port: 587
Username: tu-email@gmail.com
Password: [App Password de Gmail]
```

**Para crear App Password en Gmail:**
1. Ve a: https://myaccount.google.com/security
2. Activa verificación en 2 pasos
3. Ve a "App passwords"
4. Genera una contraseña para "Mail"
5. Copia y pega en Supabase

---

## 🔍 Troubleshooting Específico

### Error: "Invalid email"
**Causa:** El email no existe en la base de datos
**Solución:** Verifica que el usuario esté registrado

### Error: "Error sending email"
**Causa:** Configuración de email incorrecta
**Solución:** 
1. Verifica SMTP settings
2. O espera unos minutos (límite de rate)

### El correo nunca llega
**Causas posibles:**
1. **Está en spam** - Revisa spam
2. **SMTP no configurado** - Configura SMTP personalizado
3. **Rate limit** - Supabase limita emails gratis (espera)
4. **Email incorrecto** - Verifica el email

**Solución:**
1. Revisa carpeta de spam
2. Configura SMTP personalizado
3. Espera 5-10 minutos entre intentos
4. Verifica en Supabase Dashboard → Authentication → Logs

### El enlace dice "Invalid or expired link"
**Causas:**
1. El enlace ya fue usado
2. El enlace expiró (24 horas)
3. Site URL mal configurado

**Solución:**
1. Solicita un nuevo reset password
2. Usa el enlace inmediatamente
3. Verifica Site URL en Supabase

### El enlace me lleva a localhost y no funciona (móvil)
**Causa:** Site URL está configurado como localhost
**Solución:**
1. Ve a Supabase → Authentication → URL Configuration
2. Cambia Site URL a tu IP local: `http://192.168.100.4:3000`
3. Solicita nuevo reset password
4. El nuevo correo tendrá la URL correcta

---

## 🧪 Verificación Completa

### Checklist de Configuración:

- [ ] Email provider habilitado en Supabase
- [ ] Site URL configurado correctamente
- [ ] Redirect URLs incluyen todas las URLs necesarias
- [ ] Email template de "Reset Password" está configurado
- [ ] SMTP configurado (opcional pero recomendado)
- [ ] Usuario existe en la base de datos
- [ ] No hay rate limiting activo

### Test Manual:

1. **Solicitar reset:**
   ```
   1. Click "¿Olvidaste tu contraseña?"
   2. Ingresar email registrado
   3. Click "Enviar"
   4. Ver mensaje de éxito
   ```

2. **Revisar email:**
   ```
   1. Abrir bandeja de entrada
   2. Revisar spam si no aparece
   3. Buscar email de Supabase
   4. Verificar que el enlace tenga tu URL correcta
   ```

3. **Usar enlace:**
   ```
   1. Click en el enlace del correo
   2. Verificar que abre /reset-password
   3. Ingresar nueva contraseña (mínimo 6 caracteres)
   4. Confirmar contraseña
   5. Click "Actualizar Contraseña"
   6. Verificar redirección a dashboard
   ```

4. **Probar login:**
   ```
   1. Cerrar sesión
   2. Intentar login con nueva contraseña
   3. Debe funcionar correctamente
   ```

---

## 📊 Logs de Debug

Si el problema persiste, abre la consola (F12) y busca:

```javascript
// Éxito
Reset password success: { data: ... }

// Error
Reset password error: { message: "..." }
Reset password catch error: { message: "..." }
```

Comparte estos mensajes para diagnosticar mejor el problema.

---

## 🎯 Configuración Recomendada Final

**Authentication → URL Configuration:**
```
Site URL: http://192.168.100.4:3000
           (o tu dominio en producción)

Redirect URLs:
- http://localhost:3000/**
- http://192.168.100.4:3000/**
- https://tu-dominio.com/**
```

**Authentication → Providers → Email:**
```
✅ Enable Email provider: ON
✅ Confirm email: Tu preferencia
```

**Project Settings → Auth → SMTP (Opcional):**
```
✅ Enable Custom SMTP
Configurar con Gmail o SendGrid
```

---

## 📞 Si Todavía No Funciona

Proporciona:
1. **Screenshot del error** en la consola
2. **Screenshot de Site URL** en Supabase
3. **Email template** que estás usando
4. **Logs de Supabase** (Authentication → Logs)
5. **¿El correo llega?** Sí/No
6. **¿Revisaste spam?** Sí/No
7. **Mensaje de error exacto**

Con esta información podré ayudarte específicamente. 🚀
