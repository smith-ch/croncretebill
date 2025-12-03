# Sistema de Inventario Sincronizado - Documentación

## 📋 Descripción General

El sistema ahora sincroniza automáticamente el stock entre el **Catálogo de Productos** y el **Inventario**, asegurando que ambos módulos trabajen con la misma fuente de datos.

## 🔄 Funcionamiento del Sistema

### Base de Datos - Campo Unificado

**Tabla: `products`**
- `current_stock` - **Campo principal** que se actualiza automáticamente
- `available_stock` - Stock disponible (se actualiza junto con current_stock)
- `stock_quantity` - Campo legacy (para compatibilidad)

### Reducción Automática de Stock

El stock se reduce **automáticamente** cuando se crean:

1. ✅ **Facturas** (`invoice_items`)
   - Trigger: `trigger_reduce_stock_on_invoice`
   - Función: `handle_invoice_item_stock_reduction()`

2. ✅ **Recibos Térmicos** (`thermal_receipt_items`)
   - Trigger: `trigger_reduce_stock_on_thermal_receipt`
   - Función: `handle_thermal_receipt_item_stock_reduction()`

### Restauración Automática de Stock

El stock se **restaura** cuando se eliminan:

1. ✅ **Recibos Térmicos**
   - Trigger: `trigger_restore_stock_on_thermal_receipt_delete`
   - Función: `handle_thermal_receipt_item_stock_restoration()`

> **Nota:** Los servicios (items sin `product_id`) no afectan el stock

## 🛡️ Validaciones Implementadas

### En Recibos Térmicos (`app/thermal-receipts/page.tsx`)

#### 1. Validación al Cambiar Cantidad
```typescript
// Si el usuario intenta vender más de lo disponible:
if (cantidad > stock_disponible) {
  // ❌ Muestra error
  // ⚠️ Limita la cantidad al máximo disponible
}
```

#### 2. Validación al Guardar
```typescript
// Antes de guardar el recibo, verifica todo el stock
for cada item con product_id:
  if (cantidad > stock) {
    // ❌ Detiene la venta
    // 📢 Muestra mensaje: "Stock insuficiente de..."
  }
```

#### 3. Indicadores Visuales al Seleccionar Producto
- 🟢 **Verde**: Stock > 10 unidades → "X disponibles"
- 🟡 **Amarillo**: Stock ≤ 10 unidades → "X disponibles" (advertencia)
- 🔴 **Rojo**: Stock = 0 → "Agotado" (deshabilitado)

### En Catálogo de Productos (`app/products/page.tsx`)

#### Indicadores de Stock
- 🟢 **Verde**: Stock > 10 → Bueno
- 🟡 **Amarillo**: Stock ≤ 10 → Badge "Bajo"
- 🔴 **Rojo**: Stock = 0 → Badge "Agotado"

## 📝 Archivos Modificados

### 1. SQL - Triggers de Base de Datos
**Archivo:** `scripts/35-thermal-receipts-stock-trigger.sql`

```sql
-- Reducir stock al crear recibo térmico
CREATE TRIGGER trigger_reduce_stock_on_thermal_receipt
    AFTER INSERT ON thermal_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_thermal_receipt_item_stock_reduction();

-- Restaurar stock al eliminar recibo térmico
CREATE TRIGGER trigger_restore_stock_on_thermal_receipt_delete
    AFTER DELETE ON thermal_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_thermal_receipt_item_stock_restoration();
```

### 2. Frontend - Recibos Térmicos
**Archivo:** `app/thermal-receipts/page.tsx`

**Cambios:**
- ✅ Validación de stock al modificar cantidad
- ✅ Validación de stock antes de guardar
- ✅ Indicadores visuales de stock disponible
- ✅ Deshabilitar productos sin stock

### 3. Frontend - Catálogo de Productos
**Archivo:** `app/products/page.tsx`

**Cambios:**
- ✅ Mostrar `current_stock` en lugar de `stock_quantity`
- ✅ Badges de estado (Bajo/Agotado)
- ✅ Colores según nivel de stock

## 🚀 Cómo Aplicar los Cambios

### Paso 1: Ejecutar el Script SQL
```bash
# En Supabase SQL Editor:
# 1. Ir a SQL Editor
# 2. Copiar y pegar el contenido de:
scripts/35-thermal-receipts-stock-trigger.sql
# 3. Ejecutar
```

### Paso 2: Verificar Triggers
```sql
-- Verificar que los triggers se crearon correctamente
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%stock%';

-- Debería mostrar:
-- trigger_reduce_stock_on_invoice (INSERT en invoice_items)
-- trigger_reduce_stock_on_thermal_receipt (INSERT en thermal_receipt_items)
-- trigger_restore_stock_on_thermal_receipt_delete (DELETE en thermal_receipt_items)
```

### Paso 3: Reiniciar la Aplicación
```bash
# El frontend ya está actualizado
# Solo reiniciar si es necesario
npm run dev
# o
pnpm dev
```

## 🧪 Pruebas Recomendadas

### Test 1: Crear Recibo Térmico
1. Ir a **Recibos Térmicos**
2. Crear nuevo recibo
3. Seleccionar un producto
4. Verificar que muestra stock disponible
5. Intentar vender más del stock disponible
6. ✅ Debe mostrar error y limitar cantidad

### Test 2: Verificar Reducción de Stock
1. Anotar stock actual de un producto (ej: 50)
2. Crear recibo térmico vendiendo 10 unidades
3. Ir a **Catálogo de Productos**
4. ✅ Stock debe ser 40 (50 - 10)
5. Ir a **Inventario**
6. ✅ Stock debe ser 40 (sincronizado)

### Test 3: Eliminar Recibo Térmico
1. Eliminar el recibo térmico creado
2. Verificar en Catálogo
3. ✅ Stock debe restaurarse a 50

### Test 4: Stock Agotado
1. Crear recibo vendiendo todo el stock
2. Intentar crear otro recibo del mismo producto
3. ✅ Producto debe aparecer como "Agotado" (rojo)
4. ✅ No debe permitir seleccionarlo

## 📊 Flujo de Datos

```
Usuario crea recibo térmico con 5 unidades de Producto A
                    ↓
Frontend valida: ¿Hay 5 unidades disponibles?
                    ↓
              ✅ Sí → Continúa
              ❌ No → Error
                    ↓
Se guarda thermal_receipt
                    ↓
Se guardan thermal_receipt_items
                    ↓
🔥 TRIGGER: trigger_reduce_stock_on_thermal_receipt
                    ↓
Función: handle_thermal_receipt_item_stock_reduction()
                    ↓
UPDATE products SET current_stock = current_stock - 5
                    ↓
✅ Stock actualizado en la base de datos
                    ↓
Frontend recarga datos
                    ↓
✅ Catálogo e Inventario muestran nuevo stock
```

## ⚠️ Consideraciones Importantes

### 1. Sincronización de Stock
- **NO** edites manualmente `current_stock` en recibos/facturas
- Los triggers se encargan automáticamente
- Usa el módulo de **Inventario** para ajustes manuales

### 2. Servicios vs Productos
- Los **servicios** NO tienen stock
- Solo los **productos** (items con `product_id`) afectan el inventario

### 3. Compatibilidad
- El campo `stock_quantity` aún existe para compatibilidad
- El sistema usa `current_stock` como fuente principal
- Si `current_stock` es NULL, se usa `stock_quantity` como fallback

### 4. Múltiples Almacenes
- Si usas el sistema de **almacenes** (`product_warehouse_stock`):
  - El trigger también actualiza el stock del almacén correspondiente
  - Se usa la lógica de almacén predeterminado

## 🔧 Solución de Problemas

### Problema: El stock no se reduce
**Solución:**
```sql
-- Verificar que el trigger existe
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_reduce_stock_on_thermal_receipt';

-- Si no existe, ejecutar:
scripts/35-thermal-receipts-stock-trigger.sql
```

### Problema: Stock muestra NULL
**Solución:**
```sql
-- Inicializar stock de todos los productos
UPDATE products 
SET current_stock = COALESCE(stock_quantity, 0)
WHERE current_stock IS NULL;
```

### Problema: Stock desincronizado entre catálogo e inventario
**Causa:** Ambos usan el mismo campo `current_stock` de la tabla `products`
**Solución:** No debería ocurrir. Si ocurre, recargar la página (F5)

## 📞 Soporte

Si encuentras algún problema:
1. Verificar los logs de Supabase
2. Revisar que los triggers existen
3. Verificar permisos RLS
4. Reiniciar aplicación

---

**Última actualización:** Diciembre 3, 2025
**Versión del sistema:** 2.0 - Stock Sincronizado
