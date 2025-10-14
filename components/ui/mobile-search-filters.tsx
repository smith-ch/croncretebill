"use client"

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Filter,
  X,
  Calendar,
  SlidersHorizontal
} from 'lucide-react'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface MobileSearchFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  
  // Filtros de estado
  statusFilter?: string
  onStatusFilterChange?: (value: string) => void
  statusOptions?: FilterOption[]
  
  // Filtros de fecha
  dateFilter?: string
  onDateFilterChange?: (value: string) => void
  dateOptions?: FilterOption[]
  
  // Filtros adicionales
  customFilters?: {
    key: string
    label: string
    value: string
    onChange: (value: string) => void
    options: FilterOption[]
  }[]
  
  // Estado de filtros activos
  activeFiltersCount?: number
  onClearFilters?: () => void
  
  className?: string
}

export function MobileSearchFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  dateFilter, 
  onDateFilterChange,
  dateOptions,
  customFilters = [],
  activeFiltersCount = 0,
  onClearFilters,
  className
}: MobileSearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = activeFiltersCount > 0

  return (
    <div className={cn("space-y-4", className)}>
      {/* Barra de búsqueda principal */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "h-11 px-3 border-gray-200 relative transition-colors",
            showFilters && "bg-blue-50 border-blue-200",
            hasActiveFilters && "border-blue-500 text-blue-700"
          )}
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs px-1.5 py-0 h-5 w-5 rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Panel de filtros expandible */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </h3>
            {hasActiveFilters && onClearFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
              >
                Limpiar todo
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filtro de estado */}
            {statusOptions && onStatusFilterChange && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Estado</label>
                <Select value={statusFilter || "all"} onValueChange={onStatusFilterChange}>
                  <SelectTrigger className="h-9 bg-white border-gray-200">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center justify-between w-full">
                        <span>Todos los estados</span>
                      </div>
                    </SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          {option.count !== undefined && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {option.count}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro de fecha */}
            {dateOptions && onDateFilterChange && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Período
                </label>
                <Select value={dateFilter || "all"} onValueChange={onDateFilterChange}>
                  <SelectTrigger className="h-9 bg-white border-gray-200">
                    <SelectValue placeholder="Todas las fechas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las fechas</SelectItem>
                    {dateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtros personalizados */}
            {customFilters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <label className="text-xs font-medium text-gray-700">{filter.label}</label>
                <Select value={filter.value} onValueChange={filter.onChange}>
                  <SelectTrigger className="h-9 bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          {option.count !== undefined && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {option.count}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(false)}
              className="text-gray-600"
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}