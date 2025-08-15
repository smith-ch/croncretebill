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
      if (!user) return

      const { data: settings } = await supabase
        .from("company_settings")
        .select("currency_symbol, currency_code")
        .eq("user_id", user.id)
        .single()

      if (settings) {
        setCurrencySymbol(settings.currency_symbol || "RD$")
        setCurrencyCode(settings.currency_code || "DOP")
      }
    } catch (error) {
      console.error("Error fetching currency settings:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return {
    currencySymbol,
    currencyCode,
    formatCurrency,
  }
}
