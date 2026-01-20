# Sistema de Contabilidad COGS (Costo de Ventas)

## 📚 Principio Contable Fundamental

### ❌ INCORRECTO (Antes)
```
Compras $1,000 de productos → Se registra como GASTO inmediatamente
```

### ✅ CORRECTO (Ahora)
```
1. Compras $1,000 de productos → Se registra como INVENTARIO (ACTIVO)
2. Vendes 50% de los productos → ENTONCES se reconoce $500 como COSTO
3. El gasto solo se reconoce cuando VENDES, no cuando COMPRAS
```

## 🔄 Flujo del Sistema

### 1. **Compra de Productos para Inventario**

```typescript
// Usuario registra compra como "INVENTARIO"
{
  description: "100 Cemento Portland",
  amount: 10000,
  quantity: 100,
  purchase_type: "inventory"
}

// El sistema:
✅ Crea/Actualiza el producto
✅ Incrementa current_stock: +100 unidades
✅ Incrementa product_warehouse_stock: +100 unidades
✅ Registra en purchase_history
✅ NO registra como gasto aún
```

**Resultado Contable:**
- Inventario (ACTIVO): +$10,000
- Gastos: $0 (todavía no se vendió)

---

### 2. **Venta de Productos**

```typescript
// Usuario crea factura vendiendo 15 unidades a $150 c/u
{
  product_id: "cemento-portland",
  quantity: 15,
  unit_price: 150,
  total: 2250
}

// El sistema automáticamente:
✅ Reduce stock: -15 unidades (via trigger)
✅ Calcula COGS (via trigger):
   - quantity_sold: 15
   - sale_price: 150
   - total_sale: 2250
   - unit_cost: 100 (costo de compra)
   - total_cost: 1500
   - gross_profit: 750
   - profit_margin: 33.33%
```

**Resultado Contable:**
- Inventario (ACTIVO): -$1,500 (15 unidades × $100 c/u)
- Costo de Ventas (GASTO): +$1,500 ← **AQUÍ se reconoce el gasto**
- Ingresos: +$2,250
- **Utilidad Bruta: $750**

---

### 3. **Estado del Inventario**

```
Stock inicial:    100 unidades × $100 = $10,000
Stock vendido:    -15 unidades × $100 = -$1,500
Stock restante:    85 unidades × $100 = $8,500 ← Todavía es ACTIVO
```

El inventario restante ($8,500) NO es un gasto hasta que se venda.

## 📊 Tablas del Sistema

### `purchase_history`
Registra todas las compras (inventario y gastos)

```sql
SELECT * FROM purchase_history WHERE purchase_type = 'inventory';
-- Muestra: $10,000 en compras de inventario (NO es gasto aún)
```

### `cost_of_goods_sold` (COGS)
Registra el costo SOLO cuando se vende

```sql
SELECT 
  SUM(total_sale) as ingresos,
  SUM(total_cost) as costo_ventas,
  SUM(gross_profit) as utilidad_bruta
FROM cost_of_goods_sold 
WHERE DATE(sale_date) = CURRENT_DATE;

-- Resultado:
-- ingresos: $2,250
-- costo_ventas: $1,500 ← Este es el gasto real
-- utilidad_bruta: $750
```

### `products`
Mantiene el inventario actual

```sql
SELECT 
  name,
  current_stock,
  cost_price,
  (current_stock * cost_price) as valor_inventario
FROM products;

-- Cemento Portland: 85 unidades × $100 = $8,500 (ACTIVO)
```

## 🎯 Ejemplo Completo

### Mes 1: Solo Compras
```
Compra 1000 productos × $10 = $10,000

Balance:
- Inventario: $10,000 (ACTIVO)
- Gastos: $0
- Utilidad: $0
```

### Mes 2: Vendes 150 unidades
```
Venta: 150 unidades × $15 = $2,250

Automáticamente se calcula COGS:
- Costo: 150 × $10 = $1,500

Balance:
- Inventario: $8,500 (850 unidades × $10)
- Ingresos: $2,250
- Costo de Ventas: $1,500 ← Gasto reconocido
- Utilidad Bruta: $750
```

### Mes 3: Vendes otras 300 unidades
```
Venta: 300 unidades × $15 = $4,500

Automáticamente se calcula COGS:
- Costo: 300 × $10 = $3,000

Balance:
- Inventario: $5,500 (550 unidades × $10)
- Ingresos: $4,500
- Costo de Ventas: $3,000 ← Gasto reconocido
- Utilidad Bruta: $1,500
```

## 🔧 Implementación Técnica

### Trigger Automático
El sistema usa un trigger de PostgreSQL que se ejecuta automáticamente al crear una factura:

```sql
CREATE TRIGGER trigger_calculate_cogs
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_cogs_on_invoice();
```

**No requiere código adicional** - el COGS se calcula automáticamente.

### Vistas de Rentabilidad

#### Rentabilidad por Producto
```sql
SELECT * FROM v_product_profitability
WHERE user_id = 'xxx'
ORDER BY total_profit DESC;
```

#### Resumen Mensual
```sql
SELECT * FROM v_monthly_profit_summary
WHERE user_id = 'xxx'
ORDER BY month DESC;
```

## 📈 Reportes Disponibles

### 1. Utilidad por Producto
Muestra qué productos son más rentables

### 2. Utilidad Mensual
Muestra el margen de ganancia real por mes

### 3. Análisis de Inventario
Muestra el valor del inventario que aún no se ha vendido

## ✅ Ventajas del Sistema

1. **Contabilidad Correcta**: Los gastos se reconocen cuando se venden, no cuando se compran
2. **Utilidades Reales**: Calcula automáticamente el margen de ganancia real
3. **Visibilidad**: Puedes ver exactamente cuánto te costó lo que vendiste
4. **Sin Errores**: Todo es automático via triggers de base de datos
5. **FIFO Ready**: El sistema está preparado para implementar FIFO (First In, First Out)

## 🚀 Siguiente Paso: FIFO

Actualmente usa el `cost_price` promedio del producto. 
En el futuro se puede implementar FIFO para usar el costo exacto de cada lote comprado.

```
Ejemplo FIFO:
- Compra 1: 100 unidades × $10 = $1,000
- Compra 2: 100 unidades × $12 = $1,200
- Venta: 150 unidades

COGS = (100 × $10) + (50 × $12) = $1,600
(Usa primero las más antiguas)
```
