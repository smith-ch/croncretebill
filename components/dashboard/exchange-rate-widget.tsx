"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, RefreshCw, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function ExchangeRateWidget() {
  const [loading, setLoading] = useState(false)
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    loadCurrentRate()
    loadHistory()
  }, [])

  const loadCurrentRate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("company_settings")
        .select("usd_exchange_rate, updated_at")
        .eq("user_id", user.id)
        .single()

      if (data) {
        setCurrentRate(data.usd_exchange_rate)
        setLastUpdate(data.updated_at)
      }
    } catch (error) {
      console.error("Error loading exchange rate:", error)
    }
  }

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from("exchange_rates_history")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(7)

      if (data) {
        setHistory(data)
      }
    } catch (error) {
      console.error("Error loading history:", error)
    }
  }

  const handleUpdateRate = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/update-exchange-rate")
      const result = await response.json()

      if (result.success) {
        setCurrentRate(result.rate)
        setLastUpdate(new Date().toISOString())
        await loadHistory()
      }
    } catch (error) {
      console.error("Error updating rate:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-DO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTrend = () => {
    if (history.length < 2) return null
    const current = history[0].rate
    const previous = history[1].rate
    const change = current - previous
    const percentage = ((change / previous) * 100).toFixed(2)
    return { change, percentage, isPositive: change >= 0 }
  }

  const trend = getTrend()

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tasa USD/DOP
          </CardTitle>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUpdateRate}
            disabled={loading}
            className="bg-white text-green-700 hover:bg-green-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Tasa actual */}
        <div className="text-center">
          <div className="text-4xl font-bold text-green-600">
            {currentRate ? `RD$${currentRate.toFixed(2)}` : "..."}
          </div>
          <div className="text-sm text-gray-500 mt-1">Por 1 USD</div>
          {trend && (
            <div className="flex items-center justify-center gap-2 mt-2">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span
                className={`text-sm font-semibold ${
                  trend.isPositive ? "text-red-600" : "text-green-600"
                }`}
              >
                {trend.isPositive ? "+" : ""}
                {trend.percentage}%
              </span>
            </div>
          )}
        </div>

        {/* Última actualización */}
        {lastUpdate && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            Actualizado: {formatDate(lastUpdate)}
          </div>
        )}

        {/* Mini historial */}
        {history.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-600">Historial (últimos 7 días)</div>
            <div className="space-y-1">
              {history.slice(0, 3).map((record, index) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded"
                >
                  <span className="text-gray-600">{formatDate(record.fetched_at)}</span>
                  <Badge variant="outline">RD${record.rate.toFixed(2)}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
