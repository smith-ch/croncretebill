# Sistema de Precios Múltiples

El sistema de precios múltiples permite configurar diferentes precios por producto según cantidad, fechas de validez y tipos de cliente, ideal para precios mayoristas, ofertas especiales y descuentos por volumen.

## 🚀 Características

- **Precios por Cantidad**: Define diferentes precios según el rango de cantidades compradas
- **Fechas de Validez**: Establece períodos específicos para ofertas y promociones
- **Múltiples Niveles**: Configura precios para diferentes tipos de clientes (mayorista, VIP, etc.)
- **Precio por Defecto**: Designa automáticamente el precio principal del producto
- **Selección Inteligente**: El sistema recomienda automáticamente el mejor precio disponible
- **Interfaz Intuitiva**: Componentes React listos para usar con diseño moderno

## 📋 Instalación

### 1. Ejecutar Migración de Base de Datos

Ejecuta el script SQL en tu base de datos Supabase:

```sql
-- Archivo: scripts/32-create-multiple-prices-system.sql
```

Este script creará:
- Tabla `product_prices` con todas las columnas necesarias
- Políticas RLS (Row Level Security) para seguridad
- Función `get_product_price()` para obtener el precio aplicable
- Migración de datos existentes desde la tabla `products`

### 2. Tipos TypeScript

Los tipos ya están incluidos en `types/database.ts`:

```typescript
interface ProductPrice {
  id: string
  product_id: string
  price_name: string
  price: number
  min_quantity: number
  max_quantity?: number | null
  description?: string | null
  valid_from?: string | null
  valid_until?: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
```

## 🛠️ Componentes

### ProductPricesManager

Componente para gestionar precios múltiples de un producto:

```tsx
import { ProductPricesManager } from '@/components/products/product-prices-manager'

<ProductPricesManager
  productId="uuid-del-producto"
  productName="Nombre del Producto"
  onPriceChange={(price) => {
    // Se ejecuta cuando se cambia el precio por defecto
    console.log('Nuevo precio por defecto:', price)
  }}
/>
```

**Características:**
- ✅ Crear, editar y eliminar precios
- ✅ Establecer precio por defecto
- ✅ Validación de rangos de cantidad
- ✅ Fechas de validez opcionales
- ✅ Descripciones personalizadas
- ✅ Interfaz responsive

### ProductPriceSelector

Componente para seleccionar precios en formularios de venta:

```tsx
import { ProductPriceSelector } from '@/components/products/product-price-selector'

<ProductPriceSelector
  productId="uuid-del-producto"
  selectedPriceId={selectedPriceId}
  quantity={quantity}
  onPriceSelect={(priceId, price) => {
    setSelectedPriceId(priceId)
    setSelectedPrice(price)
  }}
  showQuantityInput={true}
  disabled={false}
/>
```

**Características:**
- ✅ Filtrado automático por cantidad y fechas
- ✅ Recomendación inteligente de precios
- ✅ Input de cantidad integrado
- ✅ Vista detallada del precio seleccionado
- ✅ Validación en tiempo real

## 🎯 Hook useProductPrices

Hook personalizado para manejar la lógica de precios:

```tsx
import { useProductPrices } from '@/hooks/use-product-prices'

function MiComponente({ productId }) {
  const {
    prices,           // Lista de precios del producto
    loading,          // Estado de carga
    error,           // Errores si los hay
    createPrice,     // Crear nuevo precio
    updatePrice,     // Actualizar precio existente
    deletePrice,     // Eliminar precio
    setAsDefault,    // Establecer como precio por defecto
    getApplicablePrice // Obtener precio aplicable para cantidad/fecha
  } = useProductPrices(productId)

  // Obtener el mejor precio para 10 unidades
  const bestPrice = getApplicablePrice(productId, 10)
  
  return (
    // Tu componente aquí
  )
}
```

## 📊 Ejemplos de Uso

### Precios por Volumen

```typescript
// Precio individual: $10.00 (1-9 unidades)
await createPrice({
  product_id: 'uuid-producto',
  price_name: 'Precio Individual',
  price: 10.00,
  min_quantity: 1,
  max_quantity: 9,
  is_default: true
})

// Precio mayorista: $8.50 (10-49 unidades)
await createPrice({
  product_id: 'uuid-producto',
  price_name: 'Mayorista',
  price: 8.50,
  min_quantity: 10,
  max_quantity: 49
})

// Precio distribuidor: $7.00 (50+ unidades)
await createPrice({
  product_id: 'uuid-producto',
  price_name: 'Distribuidor',
  price: 7.00,
  min_quantity: 50,
  max_quantity: null // Sin límite máximo
})
```

### Ofertas Temporales

```typescript
// Oferta especial Black Friday
await createPrice({
  product_id: 'uuid-producto',
  price_name: 'Black Friday 2024',
  price: 6.99,
  min_quantity: 1,
  max_quantity: null,
  valid_from: '2024-11-29',
  valid_until: '2024-12-01',
  description: 'Oferta especial Black Friday - 30% de descuento'
})
```

### Precios por Tipo de Cliente

```typescript
// Precio VIP
await createPrice({
  product_id: 'uuid-producto',
  price_name: 'Cliente VIP',
  price: 8.00,
  min_quantity: 1,
  max_quantity: null,
  description: 'Precio especial para clientes VIP'
})

// Precio para empleados
await createPrice({
  product_id: 'uuid-producto',
  price_name: 'Empleados',
  price: 5.00,
  min_quantity: 1,
  max_quantity: 5, // Máximo 5 unidades por empleado
  description: 'Precio especial para empleados de la empresa'
})
```

## 🔧 Integración con Formularios

### En ProductForm

El componente `ProductForm` ya incluye automáticamente el gestor de precios múltiples cuando se edita un producto existente:

```tsx
// Se muestra automáticamente si product?.id existe
{product?.id && (
  <ProductPricesManager
    productId={product.id}
    productName={product.name}
    onPriceChange={(price) => {
      // Actualiza el precio por defecto en el formulario
    }}
  />
)}
```

### En Formularios de Venta

```tsx
// En formularios de facturas, cotizaciones, etc.
<ProductPriceSelector
  productId={item.product_id}
  selectedPriceId={item.price_id}
  quantity={item.quantity}
  onPriceSelect={(priceId, price) => {
    updateItem(item.id, { 
      price_id: priceId, 
      unit_price: price 
    })
  }}
  showQuantityInput={false} // La cantidad se maneja por separado
/>
```

## 📱 Demostración

Visita `/products/multiple-prices-demo` para ver una demostración completa del sistema funcionando.

## 🛡️ Seguridad

El sistema incluye políticas RLS completas:

- **SELECT**: Usuarios pueden ver precios de productos de su organización
- **INSERT/UPDATE/DELETE**: Solo usuarios con permisos de gestión de inventario
- **Aislamiento**: Los precios están aislados por usuario/organización

## 🚀 Funcionalidades Avanzadas

### Lógica de Selección Automática

El sistema automáticamente:

1. **Filtra por cantidad**: Solo muestra precios válidos para la cantidad solicitada
2. **Filtra por fecha**: Excluye precios fuera de su período de validez  
3. **Prioriza**: Precio por defecto > Mayor cantidad mínima > Menor precio
4. **Recomienda**: Sugiere el mejor precio disponible

### Migración de Datos

El script de migración automáticamente:

- ✅ Crea un precio por defecto para cada producto existente
- ✅ Mantiene los precios actuales como precio base
- ✅ Preserva toda la información existente
- ✅ No interrumpe el funcionamiento actual

## 🤝 Contribuir

Para agregar nuevas funcionalidades:

1. Extiende el hook `useProductPrices` 
2. Actualiza los tipos en `database.ts`
3. Modifica los componentes según sea necesario
4. Agrega pruebas y documentación

## 📝 Notas

- Los precios se almacenan en la moneda base del sistema
- Las fechas utilizan formato ISO (YYYY-MM-DD)
- La cantidad mínima siempre debe ser mayor a 0
- Un producto debe tener al menos un precio por defecto
- Los rangos de cantidad no pueden solaparse para el mismo producto