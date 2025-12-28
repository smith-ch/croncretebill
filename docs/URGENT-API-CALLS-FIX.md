# 🚨 OPTIMIZACIONES URGENTES - Reducción de 600+ Llamadas

## Problema Crítico Detectado

El sistema está haciendo **más de 600 llamadas** en cada carga de página, principalmente:
- ❌ Múltiples llamadas a `supabase.auth.getUser()` (20-30 por página)
- ❌ Múltiples llamadas a `company_settings` (15-20 por página)
- ❌ Llamadas duplicadas a invoices, expenses, clients
- ❌ Error `process is not defined` en pwa-update.js

## Soluciones Implementadas

### 1. ✅ Hook de Autenticación Cacheado (`hooks/use-auth.ts`)

**Reemplaza todas las llamadas a:**
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

**Por:**
```typescript
const { user, loading } = useAuth()
```

**Beneficios:**
- Una sola llamada real por todos los componentes
- Caché de 2 minutos
- Deduplicación automática de requests simultáneos
- Manejo automático de cambios de autenticación

### 2. ✅ Hook de Datos de Empresa (`hooks/use-company-data.ts`)

**Reemplaza llamadas separadas a company_settings y user metadata por:**
```typescript
const { company, user, loading } = useCompanyData()
```

**Beneficios:**
- Queries en paralelo optimizadas
- Caché de 10 minutos para company settings
- Deduplicación automática

### 3. ✅ Arreglado Error pwa-update.js

**Cambio:**
```javascript
// ❌ ANTES (causa error en browser)
const shouldRegisterSW = process.env.NODE_ENV === 'production'

// ✅ AHORA
const shouldRegisterSW = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1'
```

### 4. ✅ Optimizados sidebar-header.tsx y mobile-nav.tsx

- Usan `useAuth()` y `useCompanyData()`
- Eliminadas llamadas duplicadas
- Agregado `user_id` a todas las queries

## Componentes Que AÚN Necesitan Optimización

### Dashboard Page (`app/dashboard/page.tsx`)
```typescript
// ❌ CAMBIAR ESTO (línea 262, 336):
const { data: { user } } = await supabase.auth.getUser()

// ✅ POR ESTO:
const { user } = useAuth()
```

### Agenda Widget (`components/dashboard/agenda-widget.tsx`)
```typescript
// ❌ CAMBIAR (línea 33):
const { data: { user } } = await supabase.auth.getUser()

// ✅ POR:
const { user } = useAuth()
```

### Company Profile Widget (`components/dashboard/company-profile-widget.tsx`)
```typescript
// ❌ CAMBIAR (línea 53):
const { data: { user }, error: authError } = await supabase.auth.getUser()
const { data: companyData } = await supabase.from('company_settings')...

// ✅ POR:
const { user, company, loading } = useCompanyData()
```

## Impacto Esperado

### Antes de Optimizaciones
```
Auth calls:        20-30 llamadas
Company settings:  15-20 llamadas
Total requests:    600+ por página
Tiempo de carga:   3-5 segundos
```

### Después de Optimizaciones (cuando se complete)
```
Auth calls:        1 llamada (cacheada)
Company settings:  1 llamada (cacheada)
Total requests:    50-80 por página ⚡ 85% menos
Tiempo de carga:   0.5-1 segundo ⚡ 80% más rápido
```

## Pasos Para Completar la Optimización

### 1. Actualizar Dashboard Page
```bash
# Editar: app/dashboard/page.tsx
# Líneas: 262, 336
```

### 2. Actualizar Widgets del Dashboard
```bash
# Editar: components/dashboard/agenda-widget.tsx (línea 33)
# Editar: components/dashboard/company-profile-widget.tsx (línea 53)
```

### 3. Buscar Otros Usos
```bash
# Ejecutar en terminal:
grep -r "supabase.auth.getUser" app/ components/ --include="*.tsx" --include="*.ts"
```

### 4. Reemplazar Sistemáticamente

Para cada archivo encontrado:

```typescript
// 1. Importar el hook
import { useAuth } from '@/hooks/use-auth'

// 2. Dentro del componente
const { user, loading, error } = useAuth()

// 3. Remover el useEffect o función que llamaba getUser()

// 4. Usar user directamente
if (!user) return <div>Loading...</div>
```

## Ejemplo Completo de Migración

### ❌ Antes
```typescript
export default function MyComponent() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    fetchUser()
  }, [])

  if (loading) return <Spinner />
  if (!user) return <div>Not authenticated</div>

  return <div>Hello {user.email}</div>
}
```

### ✅ Después
```typescript
import { useAuth } from '@/hooks/use-auth'

export default function MyComponent() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner />
  if (!user) return <div>Not authenticated</div>

  return <div>Hello {user.email}</div>
}
```

## Validación

Después de aplicar todos los cambios, verificar en DevTools:

1. **Network Tab**: Deberías ver ~85% menos requests
2. **Console**: No más warnings de "process is not defined"
3. **Performance**: Tiempo de carga debe ser < 1 segundo

## Siguiente Paso Crítico

**PRIORIDAD ALTA**: Aplicar estos cambios a:
1. ✅ sidebar-header.tsx (COMPLETADO)
2. ✅ mobile-nav.tsx (COMPLETADO)
3. ⏳ app/dashboard/page.tsx
4. ⏳ components/dashboard/*.tsx (todos los widgets)

Una vez completado, ejecutar:
```bash
npm run build
npm start
```

Y verificar en el navegador que las llamadas se hayan reducido drásticamente.
