"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Package, Calendar, Star, Info } from 'lucide-react'
import { useProductPrices, type ProductPrice } from '@/hooks/use-product-prices'
import { useCurrency } from '@/hooks/use-currency'

interface ProductPriceSelectorProps {
  productId: string
  selectedPriceId?: string | null
  quantity?: number
  onPriceSelect?: (priceId: string, priceValue: number) => void
  showQuantityInput?: boolean
  disabled?: boolean
  className?: string
}

export function ProductPriceSelector({
  productId,
  selectedPriceId,
  quantity = 1,
  onPriceSelect,
  showQuantityInput = false,
  disabled = false,
  className = ''
}: ProductPriceSelectorProps) {
  const { prices, loading, getApplicablePrice } = useProductPrices(productId)
  const { formatCurrency } = useCurrency()
  const [currentQuantity, setCurrentQuantity] = useState(quantity)
  const [selectedPrice, setSelectedPrice] = useState<ProductPrice | null>(null)
  const hasAutoSelectedRef = useRef(false)

  // Memoize applicable prices calculation
  const applicablePrices = useMemo(() => {
    if (prices.length === 0) {
      return []
    }
    
    return prices.filter(price => {
      if (!price.is_active) {
        return false
      }
      
      // Check quantity range
      if (currentQuantity < price.min_quantity) {
        return false
      }
      if (price.max_quantity !== null && price.max_quantity !== undefined && currentQuantity > price.max_quantity) {
        return false
      }
      
      // Check date validity
      const now = new Date().toISOString().split('T')[0]
      if (price.valid_from && now < price.valid_from) {
        return false
      }
      if (price.valid_until && now > price.valid_until) {
        return false
      }
      
      return true
    })
  }, [prices, currentQuantity])

  // Auto-select best price only once when component mounts or when no price is selected
  useEffect(() => {
    if (prices.length > 0 && !selectedPriceId && !selectedPrice && !hasAutoSelectedRef.current) {
      const bestPrice = getApplicablePrice(productId, currentQuantity)
      if (bestPrice) {
        hasAutoSelectedRef.current = true
        setSelectedPrice(bestPrice)
        onPriceSelect?.(bestPrice.id, bestPrice.price)
      }
    }
  }, [prices, selectedPriceId, selectedPrice, getApplicablePrice, onPriceSelect, productId, currentQuantity])

  // Reset auto-selection flag when selectedPriceId changes externally
  useEffect(() => {
    if (selectedPriceId) {
      hasAutoSelectedRef.current = false
    }
  }, [selectedPriceId])

  // Update selected price when selectedPriceId changes
  useEffect(() => {
    if (selectedPriceId && prices.length > 0) {
      const price = prices.find(p => p.id === selectedPriceId)
      if (price) {
        setSelectedPrice(price)
        hasAutoSelectedRef.current = true // Mark as selected to prevent auto-selection
      } else {
        setSelectedPrice(null)
        hasAutoSelectedRef.current = false
      }
    } else if (!selectedPriceId) {
      setSelectedPrice(null)
      hasAutoSelectedRef.current = false
    }
  }, [selectedPriceId, prices])

  const handlePriceSelect = (priceId: string) => {
    const price = prices.find(p => p.id === priceId)
    if (price) {
      setSelectedPrice(price)
      onPriceSelect?.(priceId, price.price)
    }
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0) {
      setCurrentQuantity(newQuantity)
    }
  }

  const getQuantityText = (price: ProductPrice) => {
    if (price.max_quantity === null) {
      return price.min_quantity === 1 ? 'Cualquier cantidad' : `${price.min_quantity}+ unidades`
    }
    if (price.min_quantity === price.max_quantity) {
      return `Exactamente ${price.min_quantity} unidades`
    }
    return `${price.min_quantity} - ${price.max_quantity} unidades`
  }

  const isValidForQuantity = (price: ProductPrice) => {
    if (currentQuantity < price.min_quantity) {
      return false
    }
    if (price.max_quantity !== null && price.max_quantity !== undefined && currentQuantity > price.max_quantity) {
      return false
    }
    return true
  }

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (prices.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>Precio</Label>
        <div className="text-sm text-gray-500 p-3 border rounded-md bg-gray-50">
          No hay precios configurados para este producto
        </div>
      </div>
    )
  }

  const recommendedPrice = getApplicablePrice(productId, currentQuantity)

  return (
    <div className={`space-y-4 ${className}`}>
      {showQuantityInput && (
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={currentQuantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            disabled={disabled}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Precio</Label>
        <Select
          value={selectedPrice?.id || ''}
          onValueChange={handlePriceSelect}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar precio">
              {selectedPrice && (
                <div className="flex items-center gap-2">
                  <span>{selectedPrice.price_name}</span>
                  <span className="font-medium">{formatCurrency(selectedPrice.price)}</span>
                  {selectedPrice.is_default && (
                    <Star className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {prices.map((price) => {
              const isApplicable = isValidForQuantity(price)
              const isRecommended = recommendedPrice?.id === price.id
              
              return (
                <SelectItem 
                  key={price.id} 
                  value={price.id}
                  disabled={!isApplicable}
                  className={isRecommended ? 'bg-blue-50' : ''}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className={isApplicable ? '' : 'text-gray-400'}>
                        {price.price_name}
                      </span>
                      {price.is_default && (
                        <Star className="w-3 h-3 text-yellow-500" />
                      )}
                      {isRecommended && (
                        <Badge variant="outline" className="text-xs">
                          Recomendado
                        </Badge>
                      )}
                    </div>
                    <span className={`font-medium ${isApplicable ? '' : 'text-gray-400'}`}>
                      {formatCurrency(price.price)}
                    </span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Price details card */}
      {selectedPrice && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {selectedPrice.price_name}
                </h4>
                <div className="flex items-center gap-1">
                  {selectedPrice.is_default && (
                    <Badge variant="default" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Por Defecto
                    </Badge>
                  )}
                  {recommendedPrice?.id === selectedPrice.id && (
                    <Badge variant="outline" className="text-xs">
                      Recomendado
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(selectedPrice.price)}
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>{getQuantityText(selectedPrice)}</span>
                </div>
                
                {(selectedPrice.customer_type || selectedPrice.customer_id) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedPrice.customer_type && (
                      <Badge variant="outline" className="text-xs">
                        Tipo: {selectedPrice.customer_type}
                      </Badge>
                    )}
                    {selectedPrice.customer_id && (
                      <Badge variant="outline" className="text-xs">
                        Cliente: {selectedPrice.customer_id}
                      </Badge>
                    )}
                  </div>
                )}
                
                {(selectedPrice.valid_from || selectedPrice.valid_until) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {selectedPrice.valid_from && selectedPrice.valid_until ? (
                        `${selectedPrice.valid_from} - ${selectedPrice.valid_until}`
                      ) : selectedPrice.valid_from ? (
                        `Válido desde ${selectedPrice.valid_from}`
                      ) : (
                        `Válido hasta ${selectedPrice.valid_until}`
                      )}
                    </span>
                  </div>
                )}
                
                {selectedPrice.description && (
                  <div className="flex items-start gap-2 mt-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{selectedPrice.description}</span>
                  </div>
                )}
              </div>
              
              {!isValidForQuantity(selectedPrice) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-700">
                  Este precio no es válido para la cantidad actual ({currentQuantity})
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show applicable prices summary */}
      {applicablePrices.length > 1 && showQuantityInput && (
        <div className="text-xs text-gray-500">
          {applicablePrices.length} precio{applicablePrices.length !== 1 ? 's' : ''} disponible{applicablePrices.length !== 1 ? 's' : ''} para {currentQuantity} unidad{currentQuantity !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  )
}