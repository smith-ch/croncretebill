# Sistema de Actualización Automática de Tasa de Cambio USD/DOP

## 📋 Resumen

Sistema completo para actualizar automáticamente la tasa de cambio USD/DOP todos los días a las 8:00 AM.

## 🔧 Componentes Creados

### 1. Base de Datos
- **Script 99**: Tabla `exchange_rates_history` para historial
- **Script 100**: Instrucciones y queries de verificación

### 2. API
- **`/app/api/update-exchange-rate/route.ts`**
  - Consulta API externa (exchangerate-api.com)
  - Actualiza todas las empresas con currency_code='DOP'
  - Guarda historial en `exchange_rates_history`

### 3. Hooks Actualizados
- **`hooks/use-currency.ts`**
  - Agrega `exchangeRate`, `convertToUSD()`, `formatUSD()`
  - Carga automáticamente la tasa de `company_settings`

### 4. Componentes
- **`components/currency-converter.tsx`**
  - Botón de conversión DOP ↔ USD
  - Muestra tasa actual

- **`components/dashboard/exchange-rate-widget.tsx`**
  - Widget para dashboard
  - Muestra tasa actual y tendencia
  - Botón de actualización manual
  - Mini-historial últimos 7 días

### 5. Configuración
- **Configuración de Empresa**: Campo para editar tasa manualmente
- **Cron Job**: Configurado en `vercel.json` (8:00 AM diario)

## 📦 Instalación

### Paso 1: Ejecutar Scripts SQL
```bash
# En Supabase SQL Editor:
1. Ejecutar script 98: Agregar columna usd_exchange_rate
2. Ejecutar script 99: Crear tabla exchange_rates_history
3. Ejecutar script 100: Verificar configuración
```

### Paso 2: Configurar Variables de Entorno
```env
# En Vercel/hosting, agregar:
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

> 📍 Obtener el service role key:
> Supabase Dashboard > Settings > API > service_role key (secret)

### Paso 3: Desplegar
```bash
git add .
git commit -m "Add automatic exchange rate updates"
git push
```

## 🚀 Uso

### Actualización Automática
- **Frecuencia**: Todos los días a las 8:00 AM (horario servidor)
- **API**: GET `/api/update-exchange-rate`
- **Fuente**: exchangerate-api.com (gratuita, sin API key)

### Actualización Manual
```typescript
// En cualquier componente:
const response = await fetch('/api/update-exchange-rate')
const result = await response.json()
console.log(result.rate) // Tasa actualizada
```

### Usar el Widget en Dashboard
```typescript
import { ExchangeRateWidget } from "@/components/dashboard/exchange-rate-widget"

export default function Dashboard() {
  return (
    <div>
      <ExchangeRateWidget />
    </div>
  )
}
```

### Usar Conversión en Documentos
```typescript
import { useCurrency } from "@/hooks/use-currency"

function Invoice() {
  const { formatCurrency, formatUSD, convertToUSD, exchangeRate } = useCurrency()
  const [showUSD, setShowUSD] = useState(false)
  
  const price = 1000 // DOP
  
  return (
    <div>
      <Button onClick={() => setShowUSD(!showUSD)}>
        Convertir a USD
      </Button>
      
      <div>
        {showUSD 
          ? formatUSD(convertToUSD(price)) // $15.83
          : formatCurrency(price) // RD$1,000.00
        }
      </div>
    </div>
  )
}
```

## 📊 Tasa Actual (06/01/2026)

- **Compra**: RD$62.42
- **Venta**: RD$63.93
- **Promedio**: RD$63.18

## 🔍 Verificación

### Verificar última actualización:
```sql
SELECT * FROM exchange_rates_history 
ORDER BY fetched_at DESC LIMIT 1;
```

### Ver historial 7 días:
```sql
SELECT 
  DATE(fetched_at) AS fecha,
  AVG(rate) AS promedio,
  MIN(rate) AS minima,
  MAX(rate) AS maxima
FROM exchange_rates_history
WHERE fetched_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(fetched_at)
ORDER BY fecha DESC;
```

### Verificar empresas actualizadas:
```sql
SELECT 
  company_name,
  usd_exchange_rate,
  updated_at
FROM company_settings
WHERE currency_code = 'DOP'
ORDER BY updated_at DESC;
```

## 🎯 Características

✅ Actualización automática diaria  
✅ Historial completo de tasas  
✅ Actualización manual disponible  
✅ Widget visual en dashboard  
✅ API gratuita sin límites  
✅ Tasa de compra y venta calculadas  
✅ Conversión en tiempo real  
✅ Compatible con todos los documentos  

## 🛠️ Troubleshooting

### La tasa no se actualiza
1. Verificar que el cron job esté activo en Vercel
2. Comprobar logs en Vercel Dashboard > Deployments > Functions
3. Verificar SUPABASE_SERVICE_ROLE_KEY en variables de entorno

### Error 500 en API
1. Verificar que la tabla `exchange_rates_history` existe
2. Verificar permisos RLS en `company_settings`
3. Comprobar que hay registros en `company_settings` con currency_code='DOP'

### Tasa no aparece en documentos
1. Verificar que `usd_exchange_rate` tiene valor en `company_settings`
2. Ejecutar: `UPDATE company_settings SET usd_exchange_rate = 63.18 WHERE currency_code = 'DOP'`
3. Recargar la página

## 📝 Notas

- La API gratuita (exchangerate-api.com) tiene ~1500 requests/mes
- 1 request/día = 30/mes (muy por debajo del límite)
- El spread (diferencia compra/venta) se calcula como ±1.25%
- Los datos históricos se mantienen indefinidamente

## 🔄 Cambiar Frecuencia de Actualización

Editar `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/update-exchange-rate",
    "schedule": "0 */6 * * *"  // Cada 6 horas
  }]
}
```

Opciones de schedule:
- `"0 8 * * *"` - Diario a las 8 AM
- `"0 */6 * * *"` - Cada 6 horas
- `"0 0,12 * * *"` - 12 AM y 12 PM
- `"0 8 * * 1-5"` - Días laborables a las 8 AM
