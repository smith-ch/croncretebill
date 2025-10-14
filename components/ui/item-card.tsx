"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Eye, Package, Users, Wrench } from 'lucide-react'

interface ItemCardProps {
  type: 'product' | 'service' | 'client'
  title: string
  subtitle?: string
  price?: string
  status?: string
  metadata?: string[]
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  canEdit?: boolean
  canDelete?: boolean
  className?: string
}

const getTypeConfig = (type: ItemCardProps['type']) => {
  switch (type) {
    case 'product':
      return {
        icon: Package,
        gradient: 'from-blue-500 to-indigo-600',
        bgGradient: 'from-blue-50 to-indigo-100'
      }
    case 'service':
      return {
        icon: Wrench,
        gradient: 'from-green-500 to-teal-600',
        bgGradient: 'from-green-50 to-teal-100'
      }
    case 'client':
      return {
        icon: Users,
        gradient: 'from-purple-500 to-pink-600',
        bgGradient: 'from-purple-50 to-pink-100'
      }
  }
}

const getStatusColor = (status?: string) => {
  if (!status) {
    return 'bg-gray-100 text-gray-800'
  }
  
  switch (status.toLowerCase()) {
    case 'activo':
    case 'active':
    case 'pagada':
      return 'bg-green-100 text-green-800'
    case 'pendiente':
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'inactivo':
    case 'inactive':
    case 'cancelada':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function ItemCard({
  type,
  title,
  subtitle,
  price,
  status,
  metadata = [],
  onEdit,
  onDelete,
  onView,
  canEdit = true,
  canDelete = true,
  className
}: ItemCardProps) {
  const config = getTypeConfig(type)
  const IconComponent = config.icon

  return (
    <Card className={cn(
      "group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden",
      `bg-gradient-to-br ${config.bgGradient}`,
      "hover:scale-[1.02] transform",
      className
    )}>
      {/* Header with gradient */}
      <div className={cn(
        "h-2 w-full bg-gradient-to-r",
        config.gradient
      )}></div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left side - Icon and content */}
          <div className="flex gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-white shadow-md",
              `bg-gradient-to-r ${config.gradient}`
            )}>
              <IconComponent className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title and status */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm lg:text-base truncate">
                  {title}
                </h3>
                {status && (
                  <Badge className={cn(
                    "text-xs px-2 py-0.5 flex-shrink-0",
                    getStatusColor(status)
                  )}>
                    {status}
                  </Badge>
                )}
              </div>
              
              {/* Subtitle */}
              {subtitle && (
                <p className="text-xs lg:text-sm text-gray-600 truncate mb-2">
                  {subtitle}
                </p>
              )}
              
              {/* Price */}
              {price && (
                <div className="mb-2">
                  <span className="text-lg lg:text-xl font-bold text-gray-900">
                    {price}
                  </span>
                </div>
              )}
              
              {/* Metadata */}
              {metadata.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {metadata.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center text-xs text-gray-500 bg-white/60 rounded-full px-2 py-1"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Actions */}
          <div className="flex-shrink-0 flex flex-col gap-1">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white/80"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEdit && canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white/80"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Wrapper component for grids
interface ItemGridProps {
  children: React.ReactNode
  className?: string
}

export function ItemGrid({ children, className }: ItemGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6",
      className
    )}>
      {children}
    </div>
  )
}