# 📱 PWA Features - ConcreteBill

## Características Progressive Web App

ConcreteBill está diseñado como una PWA completa que ofrece una experiencia nativa en cualquier dispositivo.

## 🚀 Instalación

### Desktop (Windows/Mac/Linux)
1. Abrir Chrome, Edge o Firefox
2. Navegar a tu instancia de ConcreteBill
3. Buscar el icono de instalación en la barra de direcciones
4. Hacer clic en "Instalar ConcreteBill"
5. La app se abrirá en una ventana dedicada

### Mobile (iOS/Android)
1. Abrir Safari (iOS) o Chrome (Android)
2. Navegar a la aplicación
3. En iOS: Compartir → Agregar a pantalla de inicio
4. En Android: Menú → Agregar a pantalla de inicio

## ⚡ Funcionalidades Offline

### Cache Strategy
- **NetworkFirst**: Datos dinámicos (facturas, clientes)
- **CacheFirst**: Assets estáticos (iconos, CSS, JS)
- **StaleWhileRevalidate**: Datos semi-estáticos (productos)

### Datos Disponibles Offline
- ✅ Dashboard básico
- ✅ Lista de productos
- ✅ Clientes frecuentes
- ✅ Facturas recientes (solo lectura)
- ❌ Crear nuevas facturas (requiere conexión)

## 🔔 Notificaciones Push

### Eventos Soportados
- Nueva factura recibida
- Recordatorio de pago vencido
- Stock bajo en productos
- Backup completado
- Actualizaciones de la aplicación

### Configuración
```javascript
// Solicitar permisos de notificación
if ('Notification' in window) {
  Notification.requestPermission()
}
```

## 📲 Service Worker

### Archivos Cacheados
```javascript
// Cache de assets principales
const CACHE_URLS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  // ... más archivos
]
```

### Estrategias de Cache
```javascript
// NetworkFirst para datos
registerRoute(
  /\/api\//,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3
  })
)

// CacheFirst para assets
registerRoute(
  /\.(js|css|png|jpg|webp)$/,
  new CacheFirst({
    cacheName: 'static-cache'
  })
)
```

## 🔄 Actualizaciones Automáticas

### Detección de Nuevas Versiones
- Service Worker verifica actualizaciones cada 60 segundos
- Notificación automática al usuario
- Opción de actualizar inmediatamente o al próximo reinicio

### Forzar Actualización
```javascript
// Forzar actualización manual
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      registration.update()
    })
}
```

## 🎯 Shortcuts y Accesos Rápidos

### Shortcuts en Manifest
```json
{
  "shortcuts": [
    {
      "name": "Nueva Factura",
      "url": "/invoices/new",
      "icons": [{"src": "/icons/invoice-icon.png", "sizes": "96x96"}]
    },
    {
      "name": "Dashboard",
      "url": "/dashboard",
      "icons": [{"src": "/icons/dashboard-icon.png", "sizes": "96x96"}]
    }
  ]
}
```

### Accesos desde Sistema Operativo
- **Windows**: Menú Inicio, barra de tareas
- **macOS**: Dock, Launchpad
- **Linux**: Menú de aplicaciones
- **Mobile**: Pantalla de inicio, drawer de apps

## 📊 Métricas PWA

### Performance
- **FCP** (First Contentful Paint): < 1.5s
- **LCP** (Largest Contentful Paint): < 2.5s
- **CLS** (Cumulative Layout Shift): < 0.1
- **FID** (First Input Delay): < 100ms

### Lighthouse Score
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100
- **PWA**: 100

## 🛠️ Desarrollo PWA

### Verificar Instalabilidad
```bash
# Usar el script de verificación
pnpm verify-pwa

# O abrir DevTools → Application → Manifest
```

### Debugging
```javascript
// Verificar estado de PWA
console.log('SW:', 'serviceWorker' in navigator)
console.log('Cache:', 'caches' in window)
console.log('Notifications:', 'Notification' in window)
```

### Testing
1. **Chrome DevTools** → Application → Service Workers
2. **Offline mode** → Network → Offline checkbox
3. **Install prompt** → Application → Manifest → Add to homescreen

## 🔧 Configuración Avanzada

### Custom Install Prompt
```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installed');
      }
      deferredPrompt = null;
    });
  }
}
```

### Manifest Dinámico
```javascript
// Cambiar configuración según usuario
const manifest = {
  name: `ConcreteBill - ${company.name}`,
  theme_color: company.brand_color,
  background_color: company.bg_color
}
```

## 📱 Plataformas Soportadas

### Desktop
- ✅ Chrome 73+
- ✅ Edge 79+
- ✅ Firefox 75+
- ❌ Safari (limitado)

### Mobile
- ✅ Chrome Android 73+
- ✅ Safari iOS 11.3+
- ✅ Samsung Internet 7.2+
- ✅ Opera Mobile 46+

## 🚨 Troubleshooting

### PWA no se Instala
1. Verificar HTTPS habilitado
2. Comprobar manifest.json válido
3. Verificar Service Worker registrado
4. Confirmar iconos 192x192 y 512x512

### Service Worker no Actualiza
1. Forzar actualización en DevTools
2. Borrar cache del navegador
3. Verificar `skipWaiting: true` en config
4. Comprobar `networkTimeoutSeconds`

### Notificaciones no Funcionan
1. Verificar permisos en navegador
2. Comprobar origen HTTPS
3. Validar formato de notificación
4. Revisar service worker activo

---

**🔧 Para más información técnica, consultar el [código fuente PWA](../public/)**