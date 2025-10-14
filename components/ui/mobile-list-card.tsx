"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreVertical, Edit } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MobileListCardProps {
  title: string
  subtitle?: string
  description?: string
  status?: {
    label: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    color?: string
  }
  avatar?: {
    initials?: string
    color?: string
    icon?: React.ReactNode
  }
  metadata?: Array<{
    label: string
    value: string | number
    icon?: React.ReactNode
  }>
  actions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'destructive'
    disabled?: boolean
  }>
  onCardClick?: () => void
  className?: string
}

export function MobileListCard({
  title,
  subtitle,
  description,
  status,
  avatar,
  metadata = [],
  actions = [],
  onCardClick,
  className
}: MobileListCardProps) {
  return (
    <Card className={cn(
      "border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white/90 backdrop-blur-sm hover:bg-white",
      onCardClick && "cursor-pointer hover:scale-[1.02]",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left Side - Avatar + Content */}
          <div 
            className="flex-1 flex gap-3 min-w-0"
            onClick={onCardClick}
          >
            {/* Avatar */}
            {avatar && (
              <div className={cn(
                "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                avatar.color || "bg-gradient-to-r from-blue-500 to-purple-600"
              )}>
                {avatar.icon || avatar.initials}
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Title & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate text-sm lg:text-base">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-xs lg:text-sm text-gray-600 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
                {status && (
                  <Badge 
                    variant={status.variant || 'default'}
                    className={cn(
                      "text-xs px-2 py-1 flex-shrink-0",
                      status.color
                    )}
                  >
                    {status.label}
                  </Badge>
                )}
              </div>
              
              {/* Description */}
              {description && (
                <p className="text-xs lg:text-sm text-gray-500 line-clamp-2">
                  {description}
                </p>
              )}
              
              {/* Metadata */}
              {metadata.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {metadata.map((item, index) => (
                    <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                      {item.icon && (
                        <span className="text-gray-400">
                          {item.icon}
                        </span>
                      )}
                      <span className="font-medium">{item.label}:</span>
                      <span>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Side - Actions */}
          {actions.length > 0 && (
            <div className="flex-shrink-0">
              {actions.length === 1 ? (
                <Button
                  variant={actions[0].variant === 'destructive' ? 'destructive' : 'ghost'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions[0].onClick()
                  }}
                  disabled={actions[0].disabled}
                  className="h-8 w-8 p-0"
                >
                  {actions[0].icon || <Edit className="h-4 w-4" />}
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.map((action, index) => (
                      <DropdownMenuItem
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          action.onClick()
                        }}
                        disabled={action.disabled}
                        className={cn(
                          "flex items-center gap-2",
                          action.variant === 'destructive' && "text-red-600 focus:text-red-600"
                        )}
                      >
                        {action.icon}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para listas vacías
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function MobileEmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
        <div className="text-gray-400 text-2xl">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-sm mx-auto">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}