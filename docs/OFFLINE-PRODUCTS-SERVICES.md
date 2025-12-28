# Guía: Crear Productos y Servicios Offline

## Problema Resuelto

Esta guía muestra cómo permitir crear productos y servicios cuando no hay conexión a internet, evitando duplicados al sincronizar.

## Solución

### 1. Sistema de IDs Temporales

Cuando creas un producto offline:
- Se genera un ID temporal: `temp_product_1734556789_abc123`
- Se guarda en el caché local con este ID
- Se añade a la cola de sincronización con el `tempId`

Cuando vuelve la conexión:
- El servidor crea el producto y devuelve el ID real
- El sistema mapea `temp_product_xxx` → `real_id_from_server`
- El caché se actualiza con el ID real
- **No hay duplicados**

### 2. Ejemplo: Formulario de Productos

```typescript
"use client"

import { useState } from 'react'
import { useOfflineOperation } from '@/hooks/use-offline-operation'
import { supabase } from '@/lib/supabase'

export function ProductForm({ userId }: { userId: string }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [products, setProducts] = useState<any[]>([])

  const { createWithQueue, fetchListWithCache, loading } = useOfflineOperation(
    userId,
    { 
      entity: 'product',
      showOfflineToast: true 
    }
  )

  // Cargar productos (funciona online y offline)
  const loadProducts = async () => {
    const data = await fetchListWithCache(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    })

    if (data) {
      setProducts(data)
    }
  }

  // Crear producto (funciona online y offline)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const productData = {
      name,
      price: parseFloat(price),
      user_id: userId,
      created_at: new Date().toISOString()
    }

    try {
      // Esta función:
      // - Si estás ONLINE: crea en el servidor inmediatamente
      // - Si estás OFFLINE: crea con ID temporal y lo añade a la cola
      const result = await createWithQueue(
        async () => {
          const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select()
            .single()
          
          if (error) throw error
          return data
        },
        productData
      )

      // result puede ser:
      // - Un objeto con el producto (si estaba online)
      // - Un string con el ID temporal (si estaba offline)
      
      if (typeof result === 'string' && result.startsWith('temp_')) {
        // Offline: actualizar lista local inmediatamente
        setProducts([
          { ...productData, id: result },
          ...products
        ])
      } else {
        // Online: actualizar lista con datos del servidor
        setProducts([result, ...products])
      }

      // Limpiar formulario
      setName('')
      setPrice('')

    } catch (error) {
      console.error('Error creating product:', error)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Nombre del Producto</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        
        <div>
          <label>Precio</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Crear Producto'}
        </button>
      </form>

      <div>
        <h3 className="font-bold mb-2">Productos</h3>
        <button onClick={loadProducts} className="text-sm text-blue-500 mb-2">
          Recargar
        </button>
        
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.id} className="p-2 border rounded">
              <div className="flex justify-between">
                <span>{product.name}</span>
                <span>${product.price}</span>
              </div>
              {product.id.startsWith('temp_') && (
                <span className="text-xs text-orange-500">
                  ⏳ Pendiente de sincronización
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

### 3. Ejemplo: Formulario de Servicios

```typescript
"use client"

import { useState } from 'react'
import { useOfflineOperation } from '@/hooks/use-offline-operation'
import { supabase } from '@/lib/supabase'

export function ServiceForm({ userId }: { userId: string }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [services, setServices] = useState<any[]>([])

  const { createWithQueue, fetchListWithCache, loading } = useOfflineOperation(
    userId,
    { 
      entity: 'service' as any, // Agregar 'service' al tipo si es necesario
      showOfflineToast: true 
    }
  )

  const loadServices = async () => {
    const data = await fetchListWithCache(async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    })

    if (data) {
      setServices(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const serviceData = {
      name,
      description,
      price: parseFloat(price),
      user_id: userId,
      created_at: new Date().toISOString()
    }

    try {
      const result = await createWithQueue(
        async () => {
          const { data, error } = await supabase
            .from('services')
            .insert([serviceData])
            .select()
            .single()
          
          if (error) throw error
          return data
        },
        serviceData
      )

      if (typeof result === 'string' && result.startsWith('temp_')) {
        setServices([
          { ...serviceData, id: result },
          ...services
        ])
      } else {
        setServices([result, ...services])
      }

      setName('')
      setDescription('')
      setPrice('')

    } catch (error) {
      console.error('Error creating service:', error)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Nombre del Servicio</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        
        <div>
          <label>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label>Precio</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Crear Servicio'}
        </button>
      </form>

      <div>
        <h3 className="font-bold mb-2">Servicios</h3>
        <button onClick={loadServices} className="text-sm text-blue-500 mb-2">
          Recargar
        </button>
        
        <ul className="space-y-2">
          {services.map((service) => (
            <li key={service.id} className="p-2 border rounded">
              <div className="flex justify-between">
                <span className="font-medium">{service.name}</span>
                <span>${service.price}</span>
              </div>
              <p className="text-sm text-gray-600">{service.description}</p>
              {service.id.startsWith('temp_') && (
                <span className="text-xs text-orange-500">
                  ⏳ Pendiente de sincronización
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

## Cómo Funciona

### Flujo Online
1. Usuario llena el formulario
2. Click en "Crear"
3. Se envía al servidor
4. Servidor responde con ID real
5. Se muestra en la lista inmediatamente

### Flujo Offline
1. Usuario llena el formulario
2. Click en "Crear"
3. Se genera ID temporal (`temp_product_123`)
4. Se guarda en caché local
5. Se añade a cola de sincronización
6. Se muestra en la lista con indicador "⏳ Pendiente"
7. **Cuando vuelve conexión:**
   - Se sincroniza automáticamente
   - Servidor devuelve ID real
   - Cache actualiza `temp_product_123` → `real_id_456`
   - Indicador desaparece
   - **NO se crea duplicado**

## Indicadores Visuales

- **🟢 Online**: Datos del servidor en tiempo real
- **📦 Offline**: Datos desde caché local
- **⏳ Pendiente**: Creado offline, esperando sincronización
- **✅ Sincronizado**: Confirmado por el servidor

## Ventajas

1. **Experiencia fluida**: Crea productos incluso sin internet
2. **Sin duplicados**: Sistema de mapeo de IDs previene duplicación
3. **Transparente**: Usuario no necesita saber si está online/offline
4. **Feedback visual**: Indicadores muestran estado de sincronización
5. **Automático**: Sincronización ocurre sin intervención del usuario

## Próximos Pasos

Para integrar en tus páginas actuales:

1. Importa `useOfflineOperation` en tu componente
2. Reemplaza llamadas directas a Supabase con métodos del hook
3. Maneja IDs temporales en tu UI
4. Agrega indicadores visuales de estado
