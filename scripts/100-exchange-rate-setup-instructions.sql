-- Script 100: Instrucciones para configurar actualización automática de tasas

-- ============================================================================
-- CONFIGURACIÓN NECESARIA
-- ============================================================================

/*
1. AGREGAR VARIABLE DE ENTORNO EN VERCEL/HOSTING:
   - SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   
   Obtener el service role key de:
   Supabase Dashboard > Settings > API > service_role key

2. EL CRON JOB YA ESTÁ CONFIGURADO EN vercel.json:
   - Se ejecuta todos los días a las 8:00 AM
   - Ruta: /api/update-exchange-rate
   - Schedule: "0 8 * * *" (cron expression)

3. VERIFICAR QUE LA TABLA exchange_rates_history EXISTE:
   - Ya fue creada en el script 99

4. PROBAR LA API MANUALMENTE:
   - Visita: https://tu-dominio.com/api/update-exchange-rate
   - Debe retornar JSON con success: true

5. OPCIONAL: AGREGAR WIDGET AL DASHBOARD
   - Importar: import { ExchangeRateWidget } from "@/components/dashboard/exchange-rate-widget"
   - Agregar en dashboard: <ExchangeRateWidget />
*/

-- ============================================================================
-- VERIFICAR CONFIGURACIÓN
-- ============================================================================

-- Ver última tasa registrada
SELECT 
  rate,
  buy_rate,
  sell_rate,
  source,
  fetched_at,
  fetched_at AT TIME ZONE 'America/Santo_Domingo' AS local_time
FROM exchange_rates_history
ORDER BY fetched_at DESC
LIMIT 1;

-- Ver historial de tasas (últimos 7 días)
SELECT 
  DATE(fetched_at AT TIME ZONE 'America/Santo_Domingo') AS fecha,
  AVG(rate) AS tasa_promedio,
  MIN(rate) AS tasa_minima,
  MAX(rate) AS tasa_maxima,
  COUNT(*) AS actualizaciones
FROM exchange_rates_history
WHERE fetched_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(fetched_at AT TIME ZONE 'America/Santo_Domingo')
ORDER BY fecha DESC;

-- Ver cuántas empresas usan DOP
SELECT 
  COUNT(*) AS empresas_con_dop,
  AVG(usd_exchange_rate) AS tasa_promedio_configurada
FROM company_settings
WHERE currency_code = 'DOP';

-- ============================================================================
-- ACTUALIZACIÓN MANUAL (SI ES NECESARIO)
-- ============================================================================

-- Actualizar todas las empresas con DOP a una tasa específica
-- DESCOMENTAR Y AJUSTAR LA TASA ANTES DE EJECUTAR:

/*
UPDATE company_settings
SET 
  usd_exchange_rate = 63.18,
  updated_at = NOW()
WHERE currency_code = 'DOP';
*/

-- ============================================================================
-- MONITOREO
-- ============================================================================

-- Verificar que las tasas se actualizan correctamente
SELECT 
  user_id,
  company_name,
  currency_code,
  usd_exchange_rate,
  updated_at AT TIME ZONE 'America/Santo_Domingo' AS ultima_actualizacion
FROM company_settings
WHERE currency_code = 'DOP'
ORDER BY updated_at DESC
LIMIT 10;
