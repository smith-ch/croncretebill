import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// API gratuita de tasas de cambio
const EXCHANGE_API_URL = "https://api.exchangerate-api.com/v4/latest/USD"

export async function GET() {
  try {
    // Obtener tasa actual de la API
    const response = await fetch(EXCHANGE_API_URL)
    if (!response.ok) {
      throw new Error("Error fetching exchange rate")
    }

    const data = await response.json()
    const dopRate = data.rates.DOP

    if (!dopRate) {
      throw new Error("DOP rate not found")
    }

    // Calcular tasa de compra y venta (spread típico 2.5%)
    const buyRate = dopRate * 0.9875 // -1.25%
    const sellRate = dopRate * 1.0125 // +1.25%

    // Crear cliente Supabase (usando variables de entorno)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Necesita service role para bypass RLS
    )

    // Guardar en historial
    await supabase.from("exchange_rates_history").insert({
      currency_from: "USD",
      currency_to: "DOP",
      rate: dopRate,
      buy_rate: buyRate,
      sell_rate: sellRate,
      source: "api_exchangerate",
      fetched_at: new Date().toISOString(),
    })

    // Actualizar todas las configuraciones de empresa
    const { data: settings } = await supabase
      .from("company_settings")
      .select("user_id")
      .eq("currency_code", "DOP")

    if (settings && settings.length > 0) {
      for (const setting of settings) {
        await supabase
          .from("company_settings")
          .update({ 
            usd_exchange_rate: dopRate,
            updated_at: new Date().toISOString() 
          })
          .eq("user_id", setting.user_id)
      }
    }

    return NextResponse.json({
      success: true,
      rate: dopRate,
      buyRate: buyRate,
      sellRate: sellRate,
      timestamp: new Date().toISOString(),
      updatedCompanies: settings?.length || 0,
    })
  } catch (error: any) {
    console.error("Error updating exchange rate:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error updating exchange rate",
      },
      { status: 500 }
    )
  }
}
