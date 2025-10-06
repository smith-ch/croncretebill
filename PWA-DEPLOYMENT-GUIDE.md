# 🚀 Guía de Diagnóstico PWA - ConcreteBill

## ❌ **Problema: No aparece opción de instalar PWA**

### 🔍 **Causas comunes y soluciones:**

## 1. **HTTPS Requerido**
- ✅ **Vercel provee HTTPS automáticamente**
- ❌ **Local debe ser localhost o HTTPS**

## 2. **Verificar Manifest**
**URL de verificación**: `https://tu-app.vercel.app/manifest.json`

**Elementos críticos:**
```json
{
  "name": "ConcreteBill - Contabilidad & Facturación",
  "short_name": "ConcreteBill",
  "start_url": "/dashboard?utm_source=pwa&v=2",
  "display": "standalone",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png", 
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## 3. **Service Worker**
**URL de verificación**: `https://tu-app.vercel.app/sw.js`

## 4. **Iconos PNG Requeridos**
- ✅ `/icons/icon-192x192.png`
- ✅ `/icons/icon-512x512.png`

---

## 🛠️ **Soluciones por Navegador:**

### **Chrome/Edge (Escritorio)**
1. **Abre DevTools** (`F12`)
2. **Ve a "Application"**
3. **Busca "Manifest"** - debe mostrar sin errores
4. **Busca "Service Workers"** - debe estar registrado
5. **En "Install Web App"** debe aparecer ✅

**Si no aparece el botón de instalación:**
- Verifica que NO esté ya instalada
- Ve a `chrome://apps/` y desinstala si existe
- Refresca la página (`Ctrl + Shift + R`)

### **Safari (iOS/macOS)**
Safari NO muestra botón de instalación automático.
**Pasos manuales:**
1. **Safari móvil**: Compartir → "Añadir a pantalla de inicio"
2. **Safari desktop**: no soporta PWA de escritorio

### **Chrome (Android)**
1. **Debe aparecer banner automático**
2. **O menú (⋮)** → "Añadir a pantalla de inicio"
3. **O menú (⋮)** → "Instalar app"

---

## 🔧 **Verificación Técnica:**

### **1. Test de Manifest**
```bash
curl -I https://tu-app.vercel.app/manifest.json
# Debe devolver 'Content-Type: application/json'
```

### **2. Test de Service Worker**
```bash
curl -I https://tu-app.vercel.app/sw.js  
# Debe devolver 'Content-Type: application/javascript'
```

### **3. Test de Iconos**
```bash
curl -I https://tu-app.vercel.app/icons/icon-192x192.png
curl -I https://tu-app.vercel.app/icons/icon-512x512.png
# Ambos deben devolver 'Content-Type: image/png'
```

---

## 📱 **Página de Diagnóstico:**

**Ve a**: `https://tu-app.vercel.app/pwa-status`

Esta página te mostrará:
- ✅/❌ Estado de HTTPS
- ✅/❌ Service Worker registrado  
- ✅/❌ Manifest válido
- ✅/❌ Iconos PNG disponibles
- ✅/❌ PWA installable

---

## 🚀 **Despliegue en Vercel:**

### **Archivos críticos que deben estar en la build:**
```
public/
├── manifest.json          ✅
├── sw.js                  ✅ (generado automáticamente)
├── robots.txt             ✅
├── browserconfig.xml      ✅
└── icons/
    ├── icon-192x192.png   ✅
    └── icon-512x512.png   ✅
```

### **Headers necesarios en Vercel:**
Crear `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    }
  ]
}
```

---

## 🔄 **Comandos de Debug:**

### **En DevTools Console:**
```javascript
// Verificar Service Worker
navigator.serviceWorker.getRegistrations().then(console.log)

// Verificar Manifest
fetch('/manifest.json').then(r => r.json()).then(console.log)

// Simular evento de instalación
window.dispatchEvent(new Event('beforeinstallprompt'))
```

---

## 📋 **Checklist Final:**

Antes del despliegue, verificar:

- [ ] ✅ HTTPS habilitado (Vercel lo hace automáticamente)
- [ ] ✅ `manifest.json` accesible y válido
- [ ] ✅ Service Worker registrado (`/sw.js`)
- [ ] ✅ Iconos PNG 192x192 y 512x512 disponibles
- [ ] ✅ `start_url` funcional
- [ ] ✅ `display: "standalone"` configurado
- [ ] ✅ Navegador soporta PWA (Chrome, Edge, Firefox, Safari)
- [ ] ✅ No hay errores en DevTools > Application
- [ ] ✅ PWA no está ya instalada

---

## 🆘 **Si nada funciona:**

1. **Verifica en incógnito** (sin extensiones)
2. **Limpia cache completamente**
3. **Usa herramientas online**:
   - [PWA Builder](https://www.pwabuilder.com/)
   - [Lighthouse PWA audit](https://web.dev/pwa-checklist/)
4. **Ve a `/pwa-status` para diagnóstico automático**

---

*Esta guía cubre todos los casos conocidos para que la PWA sea installable en producción.*