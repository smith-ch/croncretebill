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
        setCurrencySymbol((settings as any).currency_symbol || "RD$")
        setCurrencyCode((settings as any).currency_code || "DOP")
      }
    } catch (error) {
      console.error("Error fetching currency settings:", error)
    }
  }

  const formatNumber = (number: number, decimals: number = 0) => {
    // Validar que number sea un número válido
    if (typeof number !== 'number' || isNaN(number) || !isFinite(number)) {
      return '0'
    }

    try {
      // Usar formato estadounidense (comas para miles, punto para decimales)
      return number.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
      
    } catch (error) {
      console.warn("Error formatting number:", error)
      
      // Fallback: formateo manual con comas para miles y punto para decimales
      const fixed = number.toFixed(decimals)
      const parts = fixed.split('.')
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      const decimalPart = decimals > 0 ? '.' + parts[1] : ''
      
      return integerPart + decimalPart
    }
  }

  const formatCurrency = (amount: number) => {
    // Validar que amount sea un número válido
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      return `${currencySymbol}0.00`
    }

    try {
      // Usar formato estadounidense (comas para miles, punto para decimales)
      const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      return `${currencySymbol}${formattedAmount}`
      
    } catch (error) {
      console.warn("Error formatting currency:", error)
      
      // Fallback: formateo manual con comas para miles y punto para decimales
      const fixed = amount.toFixed(2)
      const parts = fixed.split('.')
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      const decimalPart = '.' + parts[1]
      
      return `${currencySymbol}${integerPart}${decimalPart}`
    }
  }

  return {
    currencySymbol,
    currencyCode,
    formatCurrency,
    formatNumber,
  }
}
