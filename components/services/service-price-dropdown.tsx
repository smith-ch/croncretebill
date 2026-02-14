"use client"

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useServicePrices, type ServicePrice } from '@/hooks/use-service-prices'
import { useCurrency } from '@/hooks/use-currency'
import { supabase } from '@/lib/supabase'

interface ServicePriceDropdownProps {
  serviceId: string
  selectedPriceId?: string | null
  quantity?: number
  onPriceSelect?: (_priceId: string, _priceValue: number) => void
  disabled?: boolean
  className?: string
}

interface ServiceInfo {
  id: string
  name: string
  price: number
}

interface ExtendedPrice extends ServicePrice {
  isBasePrice?: boolean
}

export function ServicePriceDropdown({
  serviceId,
  selectedPriceId,
  quantity = 1,
  onPriceSelect,
  disabled = false,
  className = ''
}: ServicePriceDropdownProps) {
  const { prices, loading } = useServicePrices(serviceId)
  const { formatCurrency } = useCurrency()
  const [selectedPrice, setSelectedPrice] = useState<ExtendedPrice | null>(null)
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null)
  const [serviceLoading, setServiceLoading] = useState(true)

  // Fetch service information to get base price
  useEffect(() => {
    async function fetchServiceInfo() {
      try {
        setServiceLoading(true)
        console.log(`Fetching service info for serviceId: ${serviceId}`)
        
        const { data, error } = await supabase
          .from('services')
          .select('id, name, price')
          .eq('id', serviceId)
          .single()
        
        if (error) {
          console.error('Error in service query:', error)
          throw error
        }
        
        console.log(`Service data fetched:`, data)
        setServiceInfo(data)
      } catch (err) {
        console.error('Error fetching service info:', err)
      } finally {
        setServiceLoading(false)
      }
    }

    if (serviceId) {
      fetchServiceInfo()
    }
  }, [serviceId])

  // Combine service base price with multiple prices
  const allPrices: ExtendedPrice[] = React.useMemo(() => {
    const combinedPrices: ExtendedPrice[] = []
    
    console.log(`Creating allPrices for service ${serviceId}:`)
    console.log(`- Service Info:`, serviceInfo)
    console.log(`- Base Price Check:`, serviceInfo?.price, 'type:', typeof serviceInfo?.price, 'is greater than 0?', serviceInfo?.price && serviceInfo.price > 0)
    
    // Add base price from service (only if it has a defined price > 0)
    const basePrice = serviceInfo?.price ? parseFloat(serviceInfo.price.toString()) : 0
    if (serviceInfo && basePrice > 0) {
      const basePriceObj = {
        id: `base-${serviceInfo.id}`,
        service_id: serviceInfo.id,
        price_name: 'Precio Base',
        price: basePrice,
        min_quantity: 1,
        max_quantity: null,
        description: 'Precio base del servicio',
        valid_from: null,
        valid_until: null,
        customer_type: null,
        customer_id: null,
        is_default: true,
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
  }, [serviceInfo, prices, serviceId])

  // Filter applicable prices based on quantity and validity
  const applicablePrices = allPrices.filter(price => {
    // Check quantity constraints
    const quantityValid = (price.min_quantity || 1) <= quantity &&
                         (price.max_quantity === null || quantity <= price.max_quantity)
    
    // Check date validity
    const now = new Date()
    const validFrom = price.valid_from ? new Date(price.valid_from) : null
    const validUntil = price.valid_until ? new Date(price.valid_until) : null
    
    const dateValid = (!validFrom || now >= validFrom) &&
                     (!validUntil || now <= validUntil)
    
    return quantityValid && dateValid
  })

  // Debug: log prices to console
  React.useEffect(() => {
    console.log(`ServicePriceDropdown DEBUG - Service ${serviceId}:`)
    console.log(`- Service info:`, serviceInfo)
    console.log(`- Multiple prices:`, prices)
    console.log(`- All prices combined:`, allPrices)
    console.log(`- Applicable prices (quantity ${quantity}):`, applicablePrices)
  }, [allPrices, applicablePrices, serviceId, quantity, serviceInfo, prices])

  // Auto-select best price when no price is selected
  useEffect(() => {
    if (applicablePrices.length > 0 && !selectedPriceId && !selectedPrice) {
      // Find default price first, then highest quantity applicable, then first price
      const bestPrice = applicablePrices.find(p => p.is_default) || 
                       applicablePrices.sort((a, b) => (b.min_quantity || 1) - (a.min_quantity || 1))[0]
      
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

  if (loading || serviceLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Cargando precios..." />
        </SelectTrigger>
      </Select>
    )
  }

  // Para servicios personalizados (precio base 0) sin precios múltiples, mostrar input manual
  if (allPrices.length === 0 && serviceInfo && (!serviceInfo.price || serviceInfo.price === 0)) {
    return (
      <Input
        type="number"
        step="0.01"
        min="0"
        placeholder="Precio personalizado"
        onChange={(e) => {
          const value = parseFloat(e.target.value) || 0
          // Crear un precio temporal para servicios personalizados
          if (value > 0) {
            onPriceSelect?.('custom-price', value)
          }
        }}
        className={className}
      />
    )
  }

  // Solo mostrar como disabled si no hay ningún precio (ni base ni múltiples) para servicios con precio fijo
  if (allPrices.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Sin precios definidos" />
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
            <SelectItem key={price.id} value={price.id}>
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{price.price_name || 'Precio sin nombre'}</span>
                  <span className="font-bold text-green-600 ml-4">
                    {formatCurrency(price.price)}
                  </span>
                </div>
                <div className="flex gap-1 text-xs text-muted-foreground">
                  {price.isBasePrice && (
                    <Badge variant="secondary" className="text-xs h-4">
                      Precio Base
                    </Badge>
                  )}
                  {price.is_default && !price.isBasePrice && (
                    <Badge variant="default" className="text-xs h-4">
                      Defecto
                    </Badge>
                  )}
                  {!isApplicable && (
                    <Badge variant="outline" className="text-xs h-4 bg-orange-900/30 text-orange-400">
                      Condiciones no cumplen
                    </Badge>
                  )}
                  {price.customer_type && (
                    <Badge variant="outline" className="text-xs h-4">
                      {price.customer_type}
                    </Badge>
                  )}
                  {price.customer_id && (
                    <Badge variant="outline" className="text-xs h-4">
                      Cliente específico
                    </Badge>
                  )}
                  <span className="text-xs">
                    Qty: {price.min_quantity}
                    {price.max_quantity ? `-${price.max_quantity}` : '+'}
                  </span>
                  {price.customer_id && (
                    <Badge variant="outline" className="text-xs h-4">
                      Cliente específico
                    </Badge>
                  )}
                  <span className="text-xs">
                    Qty: {price.min_quantity || 1}
                    {price.max_quantity ? `-${price.max_quantity}` : '+'}
                  </span>
                  {(price.valid_from || price.valid_until) && (
                    <Badge variant="secondary" className="text-xs h-4">
                      Limitado por fechas
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