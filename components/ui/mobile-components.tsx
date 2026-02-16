"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MobileCardProps {
  title?: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
  headerClassName?: string
}

export function MobileCard({ 
  title, 
  children, 
  className, 
  contentClassName,
  headerClassName 
}: MobileCardProps) {
  return (
    <Card className={cn(
      "border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-slate-900/90 backdrop-blur-sm",
      className
    )}>
      {title && (
        <CardHeader className={cn("pb-3 lg:pb-6", headerClassName)}>
          <CardTitle className="text-base lg:text-lg font-semibold text-gray-900">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(
        "p-4 lg:p-6 space-y-3 lg:space-y-4",
        !title && "pt-4 lg:pt-6",
        contentClassName
      )}>
        {children}
      </CardContent>
    </Card>
  )
}

interface MobileGridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4
  className?: string
}

export function MobileGrid({ children, cols = 2, className }: MobileGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn(
      "grid gap-4 lg:gap-6",
      gridCols[cols],
      className
    )}>
      {children}
    </div>
  )
}

interface MobileStatsCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  className?: string
}

export function MobileStatsCard({ 
  title, 
  value, 
  icon, 
  trend,
  color = 'blue',
  className 
}: MobileStatsCardProps) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-900/50 to-blue-800/50',
      text: 'text-blue-300',
      valueBg: 'text-slate-200',
      iconBg: 'from-blue-500 to-blue-600'
    },
    green: {
      bg: 'from-emerald-900/50 to-emerald-800/50',
      text: 'text-emerald-300',
      valueBg: 'text-slate-200',
      iconBg: 'from-emerald-500 to-emerald-600'
    },
    red: {
      bg: 'from-red-900/50 to-red-800/50',
      text: 'text-red-300',
      valueBg: 'text-slate-200',
      iconBg: 'from-red-500 to-red-600'
    },
    yellow: {
      bg: 'from-yellow-900/50 to-yellow-800/50',
      text: 'text-yellow-300',
      valueBg: 'text-slate-200',
      iconBg: 'from-yellow-500 to-yellow-600'
    },
    purple: {
      bg: 'from-purple-900/50 to-purple-800/50',
      text: 'text-purple-300',
      valueBg: 'text-slate-200',
      iconBg: 'from-purple-500 to-purple-600'
    }
  }

  const colors = colorClasses[color]

  return (
    <Card className={cn(
      "border-0 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-1",
      `bg-gradient-to-br ${colors.bg}`,
      className
    )}>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn("text-xs lg:text-sm font-medium mb-1 lg:mb-2", colors.text)}>
              {title}
            </p>
            <p className={cn("text-lg lg:text-2xl font-bold", colors.valueBg)}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && (
              <div className={cn(
                "flex items-center text-xs lg:text-sm mt-1 lg:mt-2 font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                <span className={trend.isPositive ? "▲" : "▼"}></span>
                <span className="ml-1">{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn(
              "hidden sm:flex p-2 lg:p-3 rounded-lg bg-gradient-to-br",
              colors.iconBg
            )}>
              <div className="text-white">
                {icon}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}