"use client"

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProductPrices, type ProductPrice } from '@/hooks/use-product-prices'
import { useCurrency } from '@/hooks/use-currency'
import { supabase } from '@/lib/supabase'

interface ProductPriceDropdownProps {
  productId: string
  selectedPriceId?: string | null
  quantity?: number
  onPriceSelect?: (_priceId: string, _priceValue: number) => void
  disabled?: boolean
  className?: string
}

interface ProductInfo {
  id: string
  name: string
  unit_price: number
}

interface ExtendedPrice extends ProductPrice {
  isBasePrice?: boolean
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
  const [selectedPrice, setSelectedPrice] = useState<ExtendedPrice | null>(null)
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null)
  const [productLoading, setProductLoading] = useState(true)

  // Fetch product information to get base price
  useEffect(() => {
    async function fetchProductInfo() {
      try {
        setProductLoading(true)
        console.log(`Fetching product info for productId: ${productId}`)
        
        const { data, error } = await supabase
          .from('products')
          .select('id, name, unit_price')
          .eq('id', productId)
          .single()
        
        if (error) {
          console.error('Error in product query:', error)
          throw error
        }
        
        console.log(`Product data fetched:`, data)
        setProductInfo(data)
      } catch (err) {
        console.error('Error fetching product info:', err)
      } finally {
        setProductLoading(false)
      }
    }

    if (productId) {
      fetchProductInfo()
    }
  }, [productId])

  // Combine product base price with multiple prices
  const allPrices: ExtendedPrice[] = React.useMemo(() => {
    const combinedPrices: ExtendedPrice[] = []
    
    console.log(`Creating allPrices for product ${productId}:`)
    console.log(`- Product Info:`, productInfo)
    console.log(`- Base Price Check:`, productInfo?.unit_price, 'type:', typeof productInfo?.unit_price, 'is greater than 0?', productInfo?.unit_price && productInfo.unit_price > 0)
    
    // Add base price from product (only if it has a defined price > 0)
    const basePrice = productInfo?.unit_price ? parseFloat(productInfo.unit_price.toString()) : 0
    if (productInfo && basePrice > 0) {
      const basePriceObj = {
        id: `base-${productInfo.id}`,
        product_id: productInfo.id,
        user_id: '',
        price_name: 'Precio Base',
        price: basePrice,
        min_quantity: 1,
        max_quantity: null,
        description: 'Precio base del producto',
        valid_from: null,
        valid_until: null,
        customer_type: null,
        customer_id: null,
        is_default: true,
        is_active: true,
        created_at: '',
        updated_at: '',
        isBasePrice: true
      }
      console.log(`Adding base price:`, basePriceObj)
      combinedPrices.push(basePriceObj)
    } else {
      console.log(`NOT adding base price - condition failed`)
    }
    
    // Add multiple prices
    console.log(`Adding multiple prices:`, prices)
    combinedPrices.push(...prices)
    
    console.log(`Final combined prices:`, combinedPrices)
    return combinedPrices
  }, [productInfo, prices, productId])

  // Filter applicable prices based on quantity and validity
  const applicablePrices = allPrices.filter(price => {
    // Check quantity constraints
    const minQty = price.min_quantity || 1
    const maxQty = price.max_quantity
    const quantityMatch = quantity >= minQty && (!maxQty || quantity <= maxQty)
    
    return price.is_active && quantityMatch
  })

  // Debug output
  React.useEffect(() => {
    console.log(`ProductPriceDropdown DEBUG - Product ${productId}:`)
    console.log(`- Product info:`, productInfo)
    console.log(`- Multiple prices:`, prices)
    console.log(`- All prices combined:`, allPrices)
    console.log(`- Applicable prices (quantity ${quantity}):`, applicablePrices)
  }, [productId, productInfo, prices, allPrices, applicablePrices, quantity])

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
    if (selectedPriceId && allPrices.length > 0) {
      const price = allPrices.find(p => p.id === selectedPriceId)
      if (price) {
        setSelectedPrice(price)
      }
    }
  }, [selectedPriceId, allPrices])

  if (loading || productLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Cargando precios..." />
        </SelectTrigger>
      </Select>
    )
  }

  // Para productos personalizados (precio base 0) sin precios múltiples, mostrar input manual
  if (allPrices.length === 0 && productInfo && (!productInfo.unit_price || productInfo.unit_price === 0)) {
    return (
      <Input
        type="number"
        step="0.01"
        min="0"
        placeholder="Precio personalizado"
        value={selectedPrice?.price || ''}
        onChange={(e) => {
          const value = parseFloat(e.target.value) || 0
          const customPrice: ExtendedPrice = {
            id: `custom-${productId}`,
            product_id: productId,
            user_id: '',
            price_name: 'Precio Personalizado',
            price: value,
            min_quantity: 1,
            max_quantity: null,
            description: 'Precio personalizado',
            valid_from: null,
            valid_until: null,
            customer_type: null,
            customer_id: null,
            is_default: false,
            is_active: true,
            created_at: '',
            updated_at: '',
            isBasePrice: false
          }
          setSelectedPrice(customPrice)
          onPriceSelect?.(customPrice.id, value)
        }}
        disabled={disabled}
        className={className}
      />
    )
  }

  if (allPrices.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Sin precios disponibles" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select
      value={selectedPrice?.id || ''}
      onValueChange={(value) => {
        const price = allPrices.find(p => p.id === value)
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
        {/* SIEMPRE mostrar TODOS los precios disponibles */}
        {allPrices.map((price) => {
          const isApplicable = applicablePrices.includes(price)
          return (
            <SelectItem 
              key={price.id} 
              value={price.id} 
              disabled={!price.is_active}
            >
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
                      Por Defecto
                    </Badge>
                  )}
                  {price.isBasePrice && (
                    <Badge variant="secondary" className="text-xs h-4 bg-slate-800 text-blue-400">
                      Precio Base
                    </Badge>
                  )}
                  {price.customer_type && (
                    <Badge variant="outline" className="text-xs h-4">
                      {price.customer_type}
                    </Badge>
                  )}
                  {price.customer_id && (
                    <Badge variant="outline" className="text-xs h-4">
                      Cliente Específico
                    </Badge>
                  )}
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                    Qty: {price.min_quantity}
                    {price.max_quantity ? `-${price.max_quantity}` : '+'}
                  </span>
                  {!isApplicable && (
                    <Badge variant="secondary" className="text-xs h-4 bg-yellow-100 text-yellow-700">
                      No Aplica
                    </Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}