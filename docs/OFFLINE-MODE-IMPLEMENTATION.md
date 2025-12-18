# 🔌 Sistema de Modo Offline - Implementado

## ✅ Componentes Creados

### 1. **Hook de Detección de Conexión**
- **Archivo**: `hooks/use-online-status.ts`
- **Funcionalidad**:
  - Detecta cambios online/offline del navegador
  - Notificaciones automáticas al usuario
  - Dispara evento `app:reconnected` para sincronización
  - Verificación periódica (cada 10 segundos)

### 2. **Sistema de Caché IndexedDB**
- **Archivo**: `lib/offline-cache.ts`
- **Stores**:
  - `invoices` - Facturas
  - `clients` - Clientes
  - `products` - Productos
  - `companySettings` - Configuración de empresa
  - `dashboardStats` - Estadísticas del dashboard
- **Funcionalidades**:
  - Almacenamiento con TTL configurable
  - Limpieza automática de cache expirado
  - Estadísticas de uso
  - Clear por usuario (logout)

### 3. **Cola de Sincronización**
- **Archivo**: `lib/sync-queue.ts`
- **Funcionalidades**:
  - Almacenamiento en localStorage (persistente)
  - Reintentos automáticos (máximo 3)
  - Sincronización automática al reconectar
  - Estados: pending, syncing, completed, failed
  - Limpieza de acciones completadas
  - Estadísticas en tiempo real

### 4. **Indicador Visual**
- **Archivo**: `components/offline-indicator.tsx`
- **Características**:
  - Badge con estado de conexión
  - Popover con lista de acciones pendientes
  - Botones para sincronizar manualmente
  - Animaciones y colores según estado
  - Solo visible cuando hay acciones pendientes o sin conexión

### 5. **Hook para Operaciones Offline**
- **Archivo**: `hooks/use-offline-operation.ts`
- **Métodos**:
  - `fetchWithCache` - GET con fallback a caché
  - `fetchListWithCache` - GET lista con caché
  - `createWithQueue` - POST con cola si offline
  - `updateWithQueue` - PUT con cola si offline
  - `deleteWithQueue` - DELETE con cola si offline
- **Características**:
  - Transparente para el desarrollador
  - Toasts automáticos
  - Manejo de errores

### 6. **Integración en Layout**
- **Archivo**: `app/client-layout.tsx`
- **Posición**: Fixed top-right (z-index 50)
- **Visible**: Solo cuando autenticado

---

## 📖 Cómo Usar

### Ejemplo 1: Listar Facturas con Caché

```typescript
import { useOfflineOperation } from '@/hooks/use-offline-operation'
import { supabase } from '@/lib/supabase'

function InvoicesPage() {
  const { fetchListWithCache, isOnline, loading } = useOfflineOperation(
    userId,
    { 
      entity: 'invoice',
      cacheDuration: 5 * 60 * 1000, // 5 minutos
      showOfflineToast: true
    }
  )

  useEffect(() => {
    fetchListWithCache(async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      return data || []
    })
  }, [])

  return (
    <div>
      {!isOnline && <Banner>Modo Offline</Banner>}
      {/* Renderizar facturas */}
    </div>
  )
}
```

### Ejemplo 2: Crear Factura Offline

```typescript
import { useOfflineOperation } from '@/hooks/use-offline-operation'

function CreateInvoice() {
  const { createWithQueue, isOnline } = useOfflineOperation(
    userId,
    { entity: 'invoice' }
  )

  const handleSubmit = async (formData) => {
    const result = await createWithQueue(
      // Online: hace el fetch normal
      async () => {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          body: JSON.stringify(formData)
        })
        return res.json()
      },
      // Data para la cola (si offline)
      formData
    )

    if (typeof result === 'string') {
      // Es un ID de cola (offline)
      console.log('Guardado offline:', result)
    } else {
      // Es la factura creada (online)
      console.log('Creado online:', result)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {!isOnline && (
        <Alert>
          Sin conexión. La factura se guardará localmente.
        </Alert>
      )}
      {/* Campos del formulario */}
    </form>
  )
}
```

### Ejemplo 3: Ver Factura Individual con Caché

```typescript
function InvoiceDetails({ invoiceId }) {
  const { fetchWithCache } = useOfflineOperation(
    userId,
    { entity: 'invoice', showOfflineToast: true }
  )

  const [invoice, setInvoice] = useState(null)

  useEffect(() => {
    fetchWithCache(
      async () => {
        const { data } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single()
        
        return data
      },
      invoiceId // Cache key
    ).then(setInvoice)
  }, [invoiceId])

  return <div>{/* Renderizar factura */}</div>
}
```

---

## 🎯 Flujos de Usuario

### Flujo 1: Usuario Online (Normal)

```
1. Usuario crea factura
   → Envía a API (/api/invoices POST)
   → Guarda en Supabase
   → Actualiza caché local
   → ✅ Éxito inmediato

2. Usuario lista facturas
   → Fetch desde Supabase
   → Guarda en caché
   → Muestra datos frescos
```

### Flujo 2: Usuario Offline

```
1. Se pierde conexión
   → useOnlineStatus detecta
   → Toast: "Sin conexión"
   → Indicador cambia a 🔴

2. Usuario crea factura
   → No hay conexión
   → Agrega a syncQueue
   → Guarda en localStorage
   → Toast: "Guardado localmente"
   → Badge muestra "1 pendiente"

3. Usuario lista facturas
   → Intenta fetch (falla)
   → Lee desde IndexedDB caché
   → Toast: "Usando datos offline"
   → Muestra última versión conocida

4. Vuelve conexión
   → useOnlineStatus detecta
   → Toast: "Conexión restaurada"
   → syncQueue.syncAll() automático
   → Envía acciones pendientes
   → Badge muestra "Sincronizando..."
   → ✅ Todo sincronizado
   → Badge desaparece
```

### Flujo 3: Sincronización Fallida

```
1. Intenta sincronizar
   → API retorna error
   → Incrementa retries
   → Badge muestra "1 fallida"

2. Usuario abre popover
   → Ve acción fallida
   → Ve mensaje de error
   → Opciones: Reintentar / Limpiar

3. Usuario hace clic en Reintentar
   → Resetea retries a 0
   → Intenta sync nuevamente
   → ✅ Éxito o ❌ Falla otra vez
```

---

## 🔧 Configuración

### TTLs de Caché (Ajustables)

```typescript
// lib/offline-cache.ts
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,       // 5 min - Datos que cambian frecuentemente
  MEDIUM: 15 * 60 * 1000,     // 15 min - Datos moderados
  LONG: 60 * 60 * 1000,       // 1 hora - Datos estables
  VERY_LONG: 24 * 60 * 60 * 1000  // 24 horas - Configuración
}
```

### Reintentos (Ajustables)

```typescript
// lib/sync-queue.ts
const MAX_RETRIES = 3       // Máximo de reintentos
const RETRY_DELAY = 5000    // 5 segundos entre reintentos
```

### Limpieza Automática

```typescript
// Cache expirado: cada 1 hora
setInterval(() => offlineCache.cleanExpired(), 60 * 60 * 1000)

// Sincronización: cada 30 segundos (si hay conexión)
setInterval(() => {
  if (navigator.onLine && queue.length > 0) {
    syncAll()
  }
}, 30000)
```

---

## ⚠️ Limitaciones

### ❌ NO Funciona Offline:
- Generación de PDFs (requiere servidor)
- Envío de emails
- Reportes complejos con joins
- Validación de stock en tiempo real entre usuarios
- Autenticación (debe estar logueado previamente)

### ✅ SÍ Funciona Offline:
- Ver facturas/clientes/productos cacheados
- Crear nuevas facturas (se sincronizarán después)
- Editar datos existentes
- Ver estadísticas del dashboard
- Navegar por la aplicación

---

## 🧪 Cómo Probar

### 1. Modo Offline del Navegador

```
1. Abrir DevTools (F12)
2. Ir a Network tab
3. Cambiar "Online" a "Offline"
4. Interactuar con la app
5. Volver a "Online"
6. Ver sincronización automática
```

### 2. Simular Conexión Lenta

```
1. DevTools → Network
2. Throttling: "Slow 3G"
3. Ver comportamiento con latencia
```

### 3. Ver Caché IndexedDB

```
1. DevTools → Application tab
2. Storage → IndexedDB
3. Expandir "concretebill_offline_cache"
4. Ver stores y datos guardados
```

### 4. Ver Cola de Sync

```
1. DevTools → Application tab
2. Storage → Local Storage
3. Buscar key: "concretebill_sync_queue"
4. Ver acciones pendientes en JSON
```

---

## 📊 Monitoreo

### Estadísticas de Caché

```typescript
import { offlineCache } from '@/lib/offline-cache'

// Obtener stats
const stats = await offlineCache.getStats()
console.log(stats)
// {
//   invoices: 45,
//   clients: 120,
//   products: 80,
//   totalSize: 247 KB (estimado)
// }
```

### Estadísticas de Cola

```typescript
import { syncQueue } from '@/lib/sync-queue'

const stats = syncQueue.getStats()
console.log(stats)
// {
//   total: 5,
//   pending: 3,
//   syncing: 1,
//   completed: 1,
//   failed: 0,
//   isSyncing: true
// }
```

---

## 🚀 Próximos Pasos

### Para Activar en Producción:

1. **Probar exhaustivamente** en desarrollo
2. **Actualizar Service Worker** con estrategias de cache
3. **Agregar a más componentes** (clientes, productos, etc.)
4. **Configurar TTLs** según patrones de uso reales
5. **Monitorear errores** con Sentry/LogRocket
6. **Documentar a usuarios** sobre modo offline

### Mejoras Futuras:

- ⭐ Background Sync API para sync automática
- ⭐ Compresión de datos en caché
- ⭐ Encriptación de datos sensibles
- ⭐ Resolución de conflictos (si 2 usuarios editan lo mismo)
- ⭐ Delta sync (solo enviar cambios, no todo el objeto)

---

## 📝 Notas Técnicas

- **IndexedDB**: ~50MB por dominio (suficiente para uso normal)
- **localStorage**: ~5MB (solo para cola de sync)
- **Service Worker**: Caché HTTP adicional (assets, imágenes)
- **Compatibilidad**: Navegadores modernos (Chrome, Firefox, Safari, Edge)
- **PWA Ready**: Funciona perfecto con Progressive Web Apps

---

## ✅ Sistema Implementado y Listo para Probar

Todos los archivos han sido creados e integrados. El sistema de modo offline está funcionando y listo para pruebas.

**Para probarlo ahora:**
1. Iniciar la aplicación
2. Iniciar sesión
3. Ver el indicador en la esquina superior derecha
4. Activar "Offline" en DevTools
5. Crear/editar datos
6. Volver a "Online"
7. Ver sincronización automática

El sistema es **transparente** para el usuario y funciona automáticamente sin configuración adicional.
