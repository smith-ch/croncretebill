# Sistema de Limitaciones por Suscripción

## Descripción General

El sistema ahora implementa limitaciones basadas en el plan de suscripción del usuario. Cada plan tiene límites específicos para recursos clave del sistema.

## Planes Disponibles

### 1. Plan Gratuito (Free)
- **Precio**: $0/mes
- **Límites**:
  - 1 Usuario
  - 10 Facturas/mes
  - 20 Productos
  - 10 Clientes
- **Características**: Funcionalidades básicas con marca de agua en reportes

### 2. Plan Starter
- **Precio**: $499/mes
- **Límites**:
  - 1 Usuario
  - 50 Facturas/mes
  - 50 Productos
  - 25 Clientes

### 3. Plan Professional
- **Precio**: $999/mes
- **Límites**:
  - 3 Usuarios
  - 500 Facturas/mes
  - 500 Productos
  - 200 Clientes

### 4. Plan Business
- **Precio**: $1,999/mes
- **Límites**:
  - 10 Usuarios
  - 2,000 Facturas/mes
  - 2,000 Productos
  - 1,000 Clientes

### 5. Plan Enterprise
- **Precio**: $3,999/mes
- **Límites**:
  - 50 Usuarios
  - 10,000 Facturas/mes
  - 10,000 Productos
  - 5,000 Clientes

## Implementación Técnica

### Hook: `use-subscription-limits.ts`

Hook personalizado que proporciona:
- **limits**: Objeto con los límites máximos del plan actual
- **usage**: Objeto con el uso actual de recursos
- **canAddXXX()**: Funciones para verificar si se puede agregar más de un recurso
- **remainingXXX**: Cantidad restante disponible de cada recurso
- **refreshUsage()**: Actualiza el conteo de uso
- **refreshLimits()**: Actualiza los límites (útil después de cambio de plan)

### Ejemplo de uso:

```typescript
import { useSubscriptionLimits } from '@/hooks/use-subscription-limits'

function MyComponent() {
  const { 
    limits, 
    usage, 
    canAddInvoices, 
    remainingInvoices,
    refreshUsage 
  } = useSubscriptionLimits()

  const handleCreateInvoice = () => {
    if (!canAddInvoices()) {
      toast({
        title: "Límite alcanzado",
        description: `Has alcanzado el límite de ${limits.maxInvoices} facturas/mes`,
        variant: "destructive"
      })
      return
    }
    
    // Crear factura...
    refreshUsage() // Actualizar contadores
  }
}
```

## Páginas Implementadas

### 1. Facturas (`/invoices`)
- ✅ Verifica límite antes de crear nueva factura
- ✅ Muestra alerta cuando quedan 2 o menos facturas disponibles
- ✅ Botón cambia a "Límite Alcanzado" cuando se alcanza el máximo
- ✅ Contador de facturas del mes actual

### 2. Productos (`/products`)
- ✅ Verifica límite antes de agregar producto
- ✅ Muestra alerta cuando quedan 5 o menos productos disponibles
- ✅ Botón cambia a "Límite Alcanzado" cuando se alcanza el máximo
- ✅ Contador total de productos

### 3. Clientes (`/clients`)
- ✅ Verifica límite antes de agregar cliente
- ✅ Muestra alerta cuando quedan 2 o menos clientes disponibles
- ✅ Botón cambia a "Límite Alcanzado" cuando se alcanza el máximo
- ✅ Contador total de clientes

### 4. Usuarios/Empleados (`/settings/employee-config`)
- ⏳ Pendiente implementar verificación de límite de usuarios

## Plan por Defecto

Cuando un usuario se registra:
1. Se le asigna automáticamente el **Plan Gratuito**
2. El trigger `on_user_created_assign_free_plan` crea la suscripción
3. La suscripción tiene una duración de 10 años (prácticamente ilimitada)
4. El usuario puede solicitar actualizar a otro plan desde su dashboard

## Flujo de Usuario

### Nuevo Usuario
1. Se registra en el sistema
2. Recibe Plan Gratuito automáticamente
3. Puede probar el sistema con límites básicos
4. Ve alertas cuando se acerca a los límites
5. Puede solicitar actualización de plan

### Usuario con Límite Alcanzado
1. Ve alerta roja indicando límite alcanzado
2. Botón de "Crear" cambia a "Límite Alcanzado"
3. Al hacer click, ve mensaje con opción de actualizar
4. Puede ir a `/subscriptions/my-subscription` para:
   - Ver su plan actual
   - Solicitar upgrade
   - Extender suscripción
   - Cambiar ciclo de facturación

## Base de Datos

### Script: `53-add-free-plan.sql`

Ejecutar este script para:
- Crear el Plan Gratuito
- Crear trigger para asignar plan a nuevos usuarios
- Configurar límites por defecto

### Tablas Involucradas

**subscription_plans**
- Contiene todos los planes con sus límites

**user_subscriptions**
- Relaciona usuarios con sus planes
- Almacena límites actuales (current_max_*)
- Estado de la suscripción

**subscription_requests**
- Almacena solicitudes de cambio de plan
- El admin las aprueba/rechaza

## Notificaciones y Alertas

### Alertas Visuales
- **Amarilla**: Cuando quedan pocos recursos (2-5 dependiendo del recurso)
- **Roja**: Cuando se alcanza el límite (0 restantes)
- **Link**: Todas las alertas incluyen link a `/subscriptions/my-subscription`

### Toast Notifications
- Aparecen cuando el usuario intenta crear algo con límite alcanzado
- Incluyen el nombre del plan actual
- Sugieren actualizar el plan

## Próximos Pasos

### Implementaciones Pendientes

1. **Servicios** (`/services`)
   - Agregar verificación de límite
   - Alerta de límite cercano

2. **Empleados** (`/settings/employee-config`)
   - Verificar límite de usuarios
   - Bloquear creación cuando se alcance

3. **Dashboard**
   - Widget mostrando uso vs límites
   - Gráfico de progreso

4. **Reportes**
   - Agregar marca de agua en Plan Gratuito
   - Quitar marca en planes pagados

5. **Email Notifications**
   - Notificar al usuario cuando alcance 80% del límite
   - Notificar cuando alcance 100%

## Consideraciones

### Performance
- Los límites se cargan una vez al montar el componente
- El uso se actualiza después de cada operación CRUD
- Usar `refreshUsage()` y `refreshLimits()` con moderación

### UX
- Siempre mostrar cuántos recursos quedan disponibles
- Facilitar la actualización del plan con links directos
- Mensajes claros y específicos

### Seguridad
- Las validaciones del lado del cliente son solo UX
- **IMPORTANTE**: Implementar validaciones del lado del servidor en las funciones RLS de Supabase
- Verificar límites antes de INSERT en las tablas

## Testing

### Casos de Prueba

1. **Usuario con Plan Gratuito**
   - Crear 10 facturas → debe permitir
   - Intentar crear factura 11 → debe bloqueear
   - Verificar alerta aparece en factura 9 y 10

2. **Cambio de Plan**
   - Usuario solicita upgrade
   - Admin aprueba
   - Límites se actualizan
   - Usuario puede crear más recursos

3. **Nuevo Usuario**
   - Registrarse
   - Verificar plan gratuito asignado
   - Verificar puede crear recursos dentro del límite

## Recursos Adicionales

- Hook: `hooks/use-subscription-limits.ts`
- Script SQL: `scripts/53-add-free-plan.sql`
- Páginas: `app/invoices/page.tsx`, `app/products/page.tsx`, `app/clients/page.tsx`
