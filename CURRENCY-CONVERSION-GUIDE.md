# Guía de Conversión de Moneda - Sistema Completo

## 📋 Resumen

El sistema de conversión de moneda te permite ver todos los precios tanto en DOP (Pesos Dominicanos) como en USD (Dólares Estadounidenses), tanto en la interfaz como en los PDFs generados.

## 🎯 Características

### 1. **Conversión en Tiempo Real**
- Tipo de cambio actualizado automáticamente cada día a las 8:00 AM
- Conversión instantánea en la interfaz con un clic
- Visualización dual: ambas monedas al mismo tiempo

### 2. **Vista de Lista de Presupuestos**

#### Ejemplo Visual:
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Buscar presupuestos...    [ 🔄 DOP ]  [1 USD = 63.18 DOP] │
├─────────────────────────────────────────────────────────────┤
│  PRES-2026-0001  [borrador]                                  │
│  Cliente: Hotel St. Regis Cap Cana                          │
│  Fecha: 1/6/2026  •  Válido hasta: 2/5/2026                 │
│  Proyecto: Cap Cana                                         │
│                                                              │
│                            RD$24,697.40  ← Precio principal │
│                               $390.89    ← Conversión USD   │
│                            10 elemento(s)                    │
└─────────────────────────────────────────────────────────────┘
```

#### Modo USD Activado:
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Buscar presupuestos...    [ 🔄 USD ]  [1 USD = 63.18 DOP] │
├─────────────────────────────────────────────────────────────┤
│  PRES-2026-0001  [borrador]                                  │
│                                                              │
│                               $390.89    ← Precio en USD    │
│                          RD$24,697.40 DOP ← Referencia DOP  │
└─────────────────────────────────────────────────────────────┘
```

### 3. **PDF con Conversión Dual**

El PDF generado muestra **ambas monedas simultáneamente** en cada línea:

#### Tabla de Items:
```
┌──────────────────────────────────────────────────────────────┐
│ DESCRIPCIÓN    │ CANT │ UNIDAD │ PRECIO UNIT.    │ TOTAL    │
├──────────────────────────────────────────────────────────────┤
│ Cemento Gris   │  50  │ saco   │ RD$450.00       │ RD$22,500│
│                │      │        │ ($7.12)         │ ($356.17)│
├──────────────────────────────────────────────────────────────┤
│ Arena Fina     │  5   │ m³     │ RD$1,200.00     │ RD$6,000 │
│                │      │        │ ($18.99)        │ ($94.97) │
└──────────────────────────────────────────────────────────────┘
```

#### Sección de Totales:
```
┌────────────────────────────────────────┐
│ Subtotal:    RD$22,500.00 ($356.17)   │
│ ITBIS (18%): RD$4,050.00 ($64.11)     │
│ ──────────────────────────────────────│
│ TOTAL:       RD$26,550.00 ($420.28)   │
└────────────────────────────────────────┘
```

## 🔧 Cómo Usar

### En la Vista de Presupuestos:

1. **Ver en DOP (por defecto)**
   - Muestra el precio principal en DOP
   - Muestra conversión a USD debajo en gris

2. **Convertir a USD**
   - Haz clic en el botón `[ 🔄 DOP ]`
   - Cambiará a `[ 🔄 USD ]`
   - Ahora el precio principal es USD
   - Referencia en DOP se muestra debajo

3. **Ver tipo de cambio**
   - Siempre visible: `[1 USD = 63.18 DOP]`

### En el PDF:

1. **Generación automática con ambas monedas**
   - Cada precio de producto/servicio muestra:
     - Precio en DOP (principal, en negrita)
     - Precio en USD (secundario, en gris)
   
2. **Totales con conversión**
   - Subtotal, ITBIS y Total
   - Cada uno muestra ambas monedas

## 📊 Ejemplos de Conversión

### Producto Individual:
```
Input:  Cemento Portland - RD$450.00
Output: RD$450.00 ($7.12 USD)
```

### Lista de Productos:
```
┌─────────────────────────────────────────┐
│ 1. Cemento Portland              50 uds │
│    RD$450.00/u → RD$22,500.00          │
│    ($7.12/u)  →     ($356.17)          │
├─────────────────────────────────────────┤
│ 2. Arena Lavada                   5 m³  │
│    RD$1,200.00/m³ → RD$6,000.00        │
│    ($18.99/m³)    →    ($94.97)        │
├─────────────────────────────────────────┤
│ 3. Varilla de Hierro 3/8"       100 uds│
│    RD$85.00/u → RD$8,500.00            │
│    ($1.35/u)  →    ($134.56)           │
└─────────────────────────────────────────┘

SUBTOTAL:  RD$37,000.00 ($585.70)
ITBIS 18%: RD$6,660.00  ($105.43)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:     RD$43,660.00 ($691.13)
```

## 🎨 Componentes Disponibles

### 1. `CurrencyConverter`
Botón para alternar entre monedas:
```tsx
<CurrencyConverter 
  onToggle={setShowUSD}
  exchangeRate={63.18}
  currentCurrency="DOP"
  variant="compact" // o "default"
/>
```

### 2. `DualCurrencyDisplay`
Mostrar precio con ambas monedas:
```tsx
<DualCurrencyDisplay 
  amount={24697.40}
  currencySymbol="RD$"
  exchangeRate={63.18}
  showBoth={true}
  size="lg" // "sm", "md", "lg"
/>
```

Resultado:
```
RD$24,697.40
   $390.89
```

### 3. `useConvertedCurrency` Hook
Para conversión programática:
```tsx
const { convertAmount, formatAmount, currencySymbol } = useConvertedCurrency(showUSD)

// Convertir
const converted = convertAmount(24697.40)
// Si showUSD=true: 390.89
// Si showUSD=false: 24697.40

// Formatear
const formatted = formatAmount(24697.40)
// Si showUSD=true: "$390.89"
// Si showUSD=false: "RD$24,697.40"
```

## 🔄 Flujo de Conversión

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO HACE CLIC                        │
│                          ↓                                  │
│              [ 🔄 DOP ] → [ 🔄 USD ]                       │
│                          ↓                                  │
│              Estado: showUSD = true                         │
│                          ↓                                  │
│    ┌──────────────────────────────────────────┐           │
│    │  Todos los precios se convierten:         │           │
│    │                                            │           │
│    │  Producto 1: 450 DOP → 7.12 USD          │           │
│    │  Producto 2: 1200 DOP → 18.99 USD        │           │
│    │  Total: 24,697.40 DOP → 390.89 USD       │           │
│    └──────────────────────────────────────────┘           │
│                          ↓                                  │
│            UI se actualiza instantáneamente                 │
└─────────────────────────────────────────────────────────────┘
```

## 💡 Ventajas del Sistema

### Para el Usuario:
✅ **Transparencia total** - Ve ambos precios al mismo tiempo
✅ **Sin cálculos manuales** - Conversión automática
✅ **Actualización diaria** - Tipo de cambio siempre actual
✅ **PDF profesional** - Cliente ve ambas monedas
✅ **Flexibilidad** - Alterna entre monedas con 1 clic

### Para Clientes Internacionales:
✅ Entienden el costo en su moneda
✅ Pueden comparar con otros presupuestos
✅ Documentación completa y profesional

### Para Auditoría:
✅ Registro de tipo de cambio usado
✅ Historial de tasas de cambio
✅ Transparencia en conversiones

## 📱 Compatibilidad

- ✅ Desktop
- ✅ Tablet
- ✅ Mobile
- ✅ Modo Offline (usa última tasa conocida)
- ✅ PDF Imprimible
- ✅ Todos los navegadores

## 🚀 Próximos Pasos

1. **Ejecutar scripts SQL:**
   ```bash
   # Script 98: Agregar columna usd_exchange_rate
   # Script 99: Crear tabla exchange_rates_history
   # Script 100: Instrucciones de configuración
   ```

2. **Agregar variable de entorno en Vercel:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=tu_clave_aqui
   ```

3. **Desplegar aplicación:**
   ```bash
   git add .
   git commit -m "Add currency conversion system"
   git push
   ```

4. **Verificar cron job:**
   - Ir a Vercel Dashboard
   - Deployments → Functions
   - Ver logs de `/api/update-exchange-rate`

## 📞 Soporte

Si tienes preguntas sobre el sistema de conversión:
- Revisa `EXCHANGE_RATE_SYSTEM.md` para configuración
- Verifica los logs en `exchange_rates_history` table
- Revisa el widget en el dashboard para monitoreo

---

**Sistema implementado:** Enero 2026
**Última actualización:** 6 de Enero, 2026
