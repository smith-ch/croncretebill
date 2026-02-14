"use client"

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Filter, Tag } from 'lucide-react'
import { useCategories, type Category } from '@/hooks/use-categories'

interface CategoryFilterProps {
  selectedCategoryId?: string | null
  onCategoryChange: (categoryId: string | null) => void
  type?: 'product' | 'service' | 'both'
  className?: string
}

export function CategoryFilter({ 
  selectedCategoryId, 
  onCategoryChange, 
  type = 'both',
  className 
}: CategoryFilterProps) {
  const { categories, loading } = useCategories(type)

  const getFilteredCategories = () => {
    if (type === 'both') return categories
    return categories.filter(cat => cat.type === type || cat.type === 'both')
  }

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId)

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-slate-400">Cargando categorías...</span>
      </div>
    )
  }

  const filteredCategories = getFilteredCategories()

  if (filteredCategories.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-slate-400" />
        <span className="font-medium text-sm text-slate-300">Filtrar por categoría:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategoryId === null ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(null)}
          className="h-8"
        >
          Todas
          {selectedCategoryId === null && (
            <span className="ml-2 bg-white/20 text-xs px-1.5 py-0.5 rounded">
              {type === 'product' ? 'Productos' : type === 'service' ? 'Servicios' : 'Todos'}
            </span>
          )}
        </Button>
        
        {filteredCategories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategoryId === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className="h-8 relative"
            style={{
              backgroundColor: selectedCategoryId === category.id ? category.color : undefined,
              borderColor: category.color,
            }}
          >
            <div 
              className="w-2 h-2 rounded-full mr-2 flex-shrink-0" 
              style={{ backgroundColor: selectedCategoryId === category.id ? 'white' : category.color }}
            />
            <span>{category.name}</span>
            {selectedCategoryId === category.id && (
              <X 
                className="w-3 h-3 ml-2 cursor-pointer hover:bg-white/20 rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  onCategoryChange(null)
                }}
              />
            )}
          </Button>
        ))}
      </div>

      {selectedCategory && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: selectedCategory.color }}
          />
          <div className="flex-1">
            <h4 className="font-medium text-sm">{selectedCategory.name}</h4>
            {selectedCategory.description && (
              <p className="text-xs text-slate-400 mt-1">{selectedCategory.description}</p>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            {selectedCategory.type === 'both' ? 'Ambos' : 
             selectedCategory.type === 'product' ? 'Producto' : 'Servicio'}
          </Badge>
        </div>
      )}
    </div>
  )
}