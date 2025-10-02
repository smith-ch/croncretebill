"use client"

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useProductPrices, type ProductPrice } from '@/hooks/use-product-prices'
import { useCurrency } from '@/hooks/use-currency'

interface ProductPriceDropdownProps {
  productId: string
  selectedPriceId?: string | null
  quantity?: number
  onPriceSelect?: (priceId: string, priceValue: number) => void
  disabled?: boolean
  className?: string
}

export function ProductPriceDropdown({
  productId,
  selectedPriceId,
  quantity = 1,
  onPriceSelect,
  disabled = false,
  className = ''
}: ProductPriceDropdownProps) {
  const { prices, loading } = useProductPrices(productId)
  const { formatCurrency } = useCurrency()
  const [selectedPrice, setSelectedPrice] = useState<ProductPrice | null>(null)

  // Show all active prices for now (less strict filtering for debugging)
  const applicablePrices = prices.filter(price => {
    return price.is_active
  })

  // Debug: log prices to console
  React.useEffect(() => {
    if (prices.length > 0) {
      console.log(`ProductPriceDropdown - Product ${productId} has ${prices.length} total prices:`, prices)
      console.log(`Applicable prices (quantity ${quantity}):`, applicablePrices)
    }
  }, [prices, applicablePrices, productId, quantity])

  // Auto-select best price when no price is selected
  useEffect(() => {
    if (applicablePrices.length > 0 && !selectedPriceId && !selectedPrice) {
      // Find default price first, then highest quantity applicable, then first price
      const bestPrice = applicablePrices.find(p => p.is_default) || 
                       applicablePrices.sort((a, b) => b.min_quantity - a.min_quantity)[0]
      
      if (bestPrice) {
        setSelectedPrice(bestPrice)
        onPriceSelect?.(bestPrice.id, bestPrice.price)
      }
    }
  }, [applicablePrices, selectedPriceId, selectedPrice, onPriceSelect])

  // Update selected price when selectedPriceId changes
  useEffect(() => {
    if (selectedPriceId && prices.length > 0) {
      const price = prices.find(p => p.id === selectedPriceId)
      if (price) {
        setSelectedPrice(price)
      }
    }
  }, [selectedPriceId, prices])

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Cargando precios..." />
        </SelectTrigger>
      </Select>
    )
  }

  if (applicablePrices.length === 0) {
    const hasInactivePrices = prices.length > 0
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder={
            hasInactivePrices 
              ? `${prices.length} precios encontrados pero no aplicables` 
              : "Sin precios disponibles"
          } />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select
      value={selectedPrice?.id || ''}
      onValueChange={(value) => {
        const price = prices.find(p => p.id === value)
        if (price) {
          setSelectedPrice(price)
          onPriceSelect?.(price.id, price.price)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Seleccionar precio">
          {selectedPrice && (
            <div className="flex items-center justify-between w-full">
              <span className="truncate">{selectedPrice.price_name}</span>
              <span className="font-medium text-green-600 ml-2">
                {formatCurrency(selectedPrice.price)}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {applicablePrices.length > 0 ? (
          applicablePrices.map((price) => (
            <SelectItem key={price.id} value={price.id}>
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{price.price_name}</span>
                  <span className="font-bold text-green-600 ml-4">
                    {formatCurrency(price.price)}
                  </span>
                </div>
                <div className="flex gap-1 text-xs text-muted-foreground">
                  {price.is_default && (
                    <Badge variant="default" className="text-xs h-4">
                      Defecto
                    </Badge>
                  )}
                  {price.customer_type && (
                    <Badge variant="outline" className="text-xs h-4">
                      {price.customer_type}
                    </Badge>
                  )}
                  {price.customer_id && (
                    <Badge variant="outline" className="text-xs h-4">
                      {price.customer_id}
                    </Badge>
                  )}
                  <span className="text-xs">
                    Qty: {price.min_quantity}
                    {price.max_quantity ? `-${price.max_quantity}` : '+'}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))
        ) : (
          // Show all prices as fallback, but indicate they might not be applicable
          prices.map((price) => (
            <SelectItem key={price.id} value={price.id} disabled={!price.is_active}>
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${price.is_active ? '' : 'text-gray-400'}`}>
                    {price.price_name}
                  </span>
                  <span className={`font-bold ml-4 ${price.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {formatCurrency(price.price)}
                  </span>
                </div>
                <div className="flex gap-1 text-xs text-muted-foreground">
                  {!price.is_active && (
                    <Badge variant="destructive" className="text-xs h-4">
                      Inactivo
                    </Badge>
                  )}
                  {price.is_default && (
                    <Badge variant="default" className="text-xs h-4">
                      Defecto
                    </Badge>
                  )}
                  {price.customer_type && (
                    <Badge variant="outline" className="text-xs h-4">
                      {price.customer_type}
                    </Badge>
                  )}
                  {price.customer_id && (
                    <Badge variant="outline" className="text-xs h-4">
                      {price.customer_id}
                    </Badge>
                  )}
                  <span className="text-xs">
                    Qty: {price.min_quantity}
                    {price.max_quantity ? `-${price.max_quantity}` : '+'}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}