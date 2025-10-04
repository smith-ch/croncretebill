"use client"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

interface OptimizedSkeletonProps {
  lines?: number
  className?: string
  height?: string
}

function OptimizedSkeleton({ 
  lines = 3, 
  className, 
  height = "h-4" 
}: OptimizedSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton 
          key={index} 
          className={cn(height, index === lines - 1 ? "w-3/4" : "w-full")} 
        />
      ))}
    </div>
  )
}

export { Skeleton, OptimizedSkeleton }