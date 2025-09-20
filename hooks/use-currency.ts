"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function useCurrency() {
  const [currencySymbol, setCurrencySymbol] = useState("RD$")
  const [currencyCode, setCurrencyCode] = useState("DOP")

  useEffect(() => {
    fetchCurrencySettings()
  }, [])

  const fetchCurrencySettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data: settings, error } = await supabase
        .from("company_settings")
        .select("currency_symbol, currency_code")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) {
        console.error("Error fetching currency settings:", error)
        return
      }

      if (settings) {
        setCurrencySymbol(settings.currency_symbol || "RD$")
        setCurrencyCode(settings.currency_code || "DOP")
      }
    } catch (error) {
      console.error("Error fetching currency settings:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    // Validar que amount sea un número válido
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      return `${currencySymbol}0.00`
    }

    try {
      // Intentar con locales comunes, comenzando con es-ES que es más compatible
      const locales = ['es-ES', 'es', 'en-US', 'en']
      
      for (const locale of locales) {
        try {
          return `${currencySymbol}${amount.toLocaleString(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        } catch (localeError) {
          continue
        }
      }
      
      // Fallback final: formateo manual confiable
      const formattedAmount = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      return `${currencySymbol}${formattedAmount}`
      
    } catch (error) {
      console.warn("Error formatting currency:", error)
      // Último recurso: formato simple
      return `${currencySymbol}${amount.toFixed(2)}`
    }
  }

  return {
    currencySymbol,
    currencyCode,
    formatCurrency,
  }
}
