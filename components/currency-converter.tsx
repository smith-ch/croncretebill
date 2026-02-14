"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DollarSign, RefreshCw, ArrowLeftRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useCurrency } from "@/hooks/use-currency"

interface CurrencyConverterProps {
  onToggle: (showUSD: boolean) => void
  exchangeRate?: number
  currentCurrency?: string
  variant?: "default" | "compact"
}

export function CurrencyConverter({ 
  onToggle, 
  exchangeRate: propExchangeRate, 
  currentCurrency = "DOP",
  variant = "default"
}: CurrencyConverterProps) {
  const [showUSD, setShowUSD] = useState(false)
  const { exchangeRate: hookExchangeRate } = useCurrency()
  const exchangeRate = propExchangeRate || hookExchangeRate

  const handleToggle = () => {
    const newState = !showUSD
    setShowUSD(newState)
    onToggle(newState)
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="flex items-center gap-2"
        >
          <ArrowLeftRight className="h-4 w-4" />
          {showUSD ? "USD" : currentCurrency}
        </Button>
        <Badge variant="secondary" className="text-xs">
          1 USD = {exchangeRate.toFixed(2)} {currentCurrency}
        </Badge>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-800 rounded-lg">
      <Button
        type="button"
        variant={showUSD ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        className={showUSD ? "bg-green-600 hover:bg-green-700" : "border-green-300 hover:bg-green-900/30"}
      >
        <DollarSign className="h-4 w-4 mr-2" />
        {showUSD ? "Mostrando en USD" : "Convertir a USD"}
      </Button>
      
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="bg-slate-900">
          Tasa: 1 USD = {exchangeRate.toFixed(2)} {currentCurrency}
        </Badge>
        {showUSD && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Precios convertidos
          </span>
        )}
      </div>
    </div>
  )
}

// Componente para mostrar precios con conversión dual
interface DualCurrencyDisplayProps {
  amount: number
  currencySymbol?: string
  exchangeRate?: number
  className?: string
  showBoth?: boolean
  size?: "sm" | "md" | "lg"
}

export function DualCurrencyDisplay({ 
  amount, 
  currencySymbol = "RD$",
  exchangeRate: propExchangeRate,
  className = "",
  showBoth = false,
  size = "md"
}: DualCurrencyDisplayProps) {
  const { exchangeRate: hookExchangeRate, formatUSD } = useCurrency()
  const exchangeRate = propExchangeRate || hookExchangeRate
  const usdAmount = amount / exchangeRate

  const formatDOP = (value: number) => {
    return `${currencySymbol}${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold"
  }

  if (showBoth) {
    return (
      <div className={`flex flex-col items-end ${className}`}>
        <span className={`${sizeClasses[size]} font-semibold text-gray-900`}>
          {formatDOP(amount)}
        </span>
        <span className="text-sm text-slate-400">
          {formatUSD(usdAmount)}
        </span>
      </div>
    )
  }

  return <span className={`${sizeClasses[size]} ${className}`}>{formatDOP(amount)}</span>
}

// Hook para manejar conversión de moneda en componentes
export function useConvertedCurrency(showUSD: boolean, exchangeRate?: number) {
  const { exchangeRate: hookExchangeRate, formatCurrency, formatUSD } = useCurrency()
  const rate = exchangeRate || hookExchangeRate

  const convertAmount = (amount: number): number => {
    return showUSD ? amount / rate : amount
  }

  const formatAmount = (amount: number): string => {
    return showUSD ? formatUSD(amount / rate) : formatCurrency(amount)
  }

  return {
    convertAmount,
    formatAmount,
    currencySymbol: showUSD ? "$" : "RD$",
    currencyCode: showUSD ? "USD" : "DOP"
  }
}

