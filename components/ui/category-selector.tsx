"use client"

import React, { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Palette, Tag } from 'lucide-react'
import { useCategories, type Category } from '@/hooks/use-categories'

interface CategorySelectorProps {
  value?: string
  onValueChange: (value: string) => void
  type?: 'product' | 'service' | 'both'
  placeholder?: string
  className?: string
}

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#6B7280', '#059669',
  '#DC2626', '#D97706', '#7C3AED', '#2563EB'
]

const PRESET_ICONS = [
  'folder', 'package', 'wrench', 'settings', 'tool', 
  'user-check', 'star', 'heart', 'shield', 'zap',
  'home', 'car', 'phone', 'mail', 'calendar'
]

export function CategorySelector({ 
  value, 
  onValueChange, 
  type = 'both', 
  placeholder = 'Seleccionar categoría',
  className 
}: CategorySelectorProps) {
  const { categories, loading, createCategory } = useCategories(type)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'folder',
    type: type === 'both' ? 'both' as const : type
  })
  const [creating, setCreating] = useState(false)

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.name.trim()) {
      return
    }

    setCreating(true)
    try {
      const created = await createCategory(newCategory)
      if (created) {
        onValueChange(created.id)
        setShowCreateDialog(false)
        setNewCategory({
          name: '',
          description: '',
          color: '#3B82F6',
          icon: 'folder',
          type: type === 'both' ? 'both' : type
        })
      }
    } catch (error) {
      console.error('Error creating category:', error)
      // Error is already handled in the hook with alert
    } finally {
      setCreating(false)
    }
  }

  const getFilteredCategories = () => {
    if (type === 'both') {
      return categories
    }
    return categories.filter(cat => cat.type === type || cat.type === 'both')
  }

  const selectedCategory = categories.find(cat => cat.id === value)

  return (
    <div className={className}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: selectedCategory.color }}
                />
                <span>{selectedCategory.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <SelectItem value="loading" disabled>
              Cargando categorías...
            </SelectItem>
          ) : (
            <>
              {getFilteredCategories().map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {category.type === 'both' ? 'Ambos' : 
                       category.type === 'product' ? 'Producto' : 'Servicio'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
              
              <div className="px-2 py-1.5">
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-blue-600 hover:text-blue-400 hover:bg-slate-900"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowCreateDialog(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span>Crear nueva categoría</span>
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      Nueva Categoría
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div>
                      <Label htmlFor="category-name">Nombre *</Label>
                      <Input
                        id="category-name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ej: Materiales de construcción"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category-description">Descripción</Label>
                      <Textarea
                        id="category-description"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción opcional de la categoría"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Color
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              newCategory.color === color ? 'border-gray-400' : 'border-slate-800'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                          />
                        ))}
                      </div>
                    </div>

                    {type === 'both' && (
                      <div>
                        <Label>Tipo</Label>
                        <Select 
                          value={newCategory.type} 
                          onValueChange={(value: 'product' | 'service' | 'both') => 
                            setNewCategory(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Productos y Servicios</SelectItem>
                            <SelectItem value="product">Solo Productos</SelectItem>
                            <SelectItem value="service">Solo Servicios</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={creating || !newCategory.name.trim()}
                        className="flex-1"
                      >
                        {creating ? 'Creando...' : 'Crear'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
                </Dialog>
              </div>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}