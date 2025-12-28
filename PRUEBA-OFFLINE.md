# 🔌 Guía de Prueba: Modo Sin Conexión

## ✅ Lo que ya está implementado

### 1. **Sistema de Cache (IndexedDB)**
- ✅ Productos y servicios se guardan automáticamente en cache
- ✅ Cache dura 24 horas
- ✅ Se actualiza cada vez que hay conexión

### 2. **Creación Offline**
- ✅ Productos se pueden crear sin conexión
- ✅ Servicios se pueden crear sin conexión
- ✅ Se usan IDs temporales: `temp_product_1234567890_abc`
- ✅ Badge "⏳ Pendiente" indica items sin sincronizar

### 3. **Sincronización Automática**
- ✅ Cola de sincronización guarda operaciones pendientes
- ✅ Al reconectar, se sincronizan automáticamente
- ✅ Los IDs temporales se reemplazan por IDs reales
- ✅ Prevención de duplicados

### 4. **Autenticación Offline**
- ✅ Usa sesión de localStorage (no requiere servidor)
- ✅ Todos los hooks actualizados (use-auth, use-categories, etc.)

---

## 🧪 Cómo Probar el Modo Offline

### **Paso 1: Cargar datos en Cache** ✨
1. **Asegúrate de tener conexión a internet**
2. Navega a `/products` - los productos se cargarán en cache
3. Navega a `/services` - los servicios se cargarán en cache
4. Abre DevTools (F12) → Application → IndexedDB → `croncretebill-db-v2`
5. Verifica que hay datos en `products` y `services`

### **Paso 2: Probar Sin Conexión** 🔌
1. **Desconecta el internet** (WiFi off o modo avión)
2. O usa DevTools: Network tab → Throttling → "Offline"
3. Recarga la página `/products`
4. **Deberías ver**: 
   - ✅ Productos cargando desde cache
   - ✅ Consola: `"📦 Loading products from cache (offline mode)"`
   - ✅ Los productos aparecen normalmente

### **Paso 3: Crear Producto Offline** ➕
1. Clic en "Añadir Producto"
2. Llena el formulario:
   - Nombre: "Producto de Prueba Offline"
   - Precio: 100
   - Unidad: unidad
3. Clic en "Guardar"
4. **Deberías ver**:
   - ✅ Toast: "✅ Producto guardado (se sincronizará al conectar)"
   - ✅ Badge "⏳ Pendiente" junto al producto
   - ✅ ID temporal: `temp_product_1234567890_abc`

### **Paso 4: Verificar Cola de Sincronización** 📋
1. Abre DevTools → Application → IndexedDB → `croncretebill-db-v2`
2. Ve a la tabla `syncQueue`
3. **Deberías ver** un registro:
   ```json
   {
     "id": "sync_123...",
     "operation": "create",
     "entity": "products",
     "data": { ... },
     "status": "pending",
     "tempId": "temp_product_..."
   }
   ```

### **Paso 5: Probar Sincronización** 🔄
1. **Reconecta el internet**
2. Espera 2-3 segundos
3. **Deberías ver**:
   - ✅ El badge "⏳ Pendiente" desaparece
   - ✅ El ID temporal cambia a un ID real (UUID)
   - ✅ Consola: "🔄 Syncing 1 pending operations..."
   - ✅ Consola: "✅ Sync completed successfully"

### **Paso 6: Verificar en Base de Datos** 💾
1. Ve a Supabase Dashboard
2. Table Editor → `products`
3. **Deberías ver** tu producto recién creado
4. El producto tiene un ID real (UUID)
5. Ya no está en la cola de sincronización

---

## 🐛 Problemas Comunes y Soluciones

### ❌ "No hay productos en cache"
**Causa**: No has navegado a `/products` con conexión
**Solución**: 
1. Conecta internet
2. Ve a `/products` 
3. Espera que carguen
4. Ahora desconecta y recarga

### ❌ "Los productos no aparecen offline"
**Causa**: Cache expiró (después de 24 horas)
**Solución**:
1. Reconecta internet
2. Recarga `/products` para actualizar cache
3. Vuelve a probar offline

### ❌ "El producto no se sincronizó"
**Causa**: No has esperado lo suficiente o hay un error
**Solución**:
1. Verifica que tienes internet
2. Abre consola para ver logs
3. Recarga la página (trigger sync manual)
4. Si persiste, revisa la cola: IndexedDB → syncQueue

### ❌ "Se crearon duplicados"
**Causa**: Poco probable, el sistema previene duplicados
**Solución**:
1. Revisa en syncQueue si hay items con mismo tempId
2. Si hay duplicados en BD, elimina manualmente
3. Reporta el bug

---

## 📊 Verificación Completa

### ✅ Checklist de Funcionalidad

- [ ] **Cache funciona**: Productos aparecen sin internet
- [ ] **Crear offline**: Puedo crear productos sin conexión
- [ ] **Badge visible**: Veo "⏳ Pendiente" en items offline
- [ ] **Cola funciona**: syncQueue tiene el item pendiente
- [ ] **Sincronización**: Al reconectar, se sube al servidor
- [ ] **ID mapping**: El tempId se reemplaza por ID real
- [ ] **Sin duplicados**: No se crearon múltiples copias
- [ ] **Facturas offline**: Puedo crear facturas con productos del cache

---

## 🎯 Próximos Pasos

### Para mejorar el modo offline:

1. **Indicador de conexión más visible**
   - Agregar banner en la parte superior cuando estás offline
   - Mostrar contador de items pendientes de sincronización

2. **Sincronización manual**
   - Botón "Sincronizar ahora" para usuarios impacientes
   - Barra de progreso durante la sincronización

3. **Cache más inteligente**
   - Pre-cargar datos críticos en segundo plano
   - Actualizar cache periódicamente en background

4. **Más entidades offline**
   - Clientes offline
   - Facturas offline completas
   - Gastos offline

5. **Manejo de conflictos**
   - Detectar si el item fue modificado en el servidor
   - Dar opción al usuario de resolver conflictos

---

## 🚀 Estado Actual

### ✅ **Funcionando:**
- Productos offline (lectura y escritura)
- Servicios offline (lectura y escritura)
- Cache IndexedDB con duración de 24h
- Cola de sincronización automática
- Prevención de duplicados
- Autenticación offline (getSession)

### ⏳ **Parcialmente:**
- Indicador de conexión (existe pero necesita mejoras)
- Sincronización (funciona pero no hay feedback visual claro)

### ❌ **Pendiente:**
- Clientes offline
- Facturas offline completas
- Gastos offline
- Manejo de conflictos
- Sincronización manual con botón

---

## 📝 Notas Técnicas

### Archivos Clave:
- `lib/offline-cache.ts` - Sistema de cache IndexedDB
- `lib/sync-queue.ts` - Cola de sincronización
- `hooks/use-offline-operation.ts` - Hook principal
- `hooks/use-online-status.ts` - Detector de conexión
- `lib/offline-auth.ts` - Autenticación sin servidor
- `components/forms/product-form.tsx` - Formulario con soporte offline
- `app/products/page.tsx` - Lista con cache fallback

### Funciones Importantes:
- `generateTempId()` - Crea IDs temporales únicos
- `addToQueue()` - Agrega operación a la cola
- `syncPendingOperations()` - Sincroniza cola con servidor
- `getOfflineUser()` - Obtiene usuario sin conexión
- `offlineCache.set/get/getAll()` - Manejo de cache
