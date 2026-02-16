"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2, Sparkles } from "lucide-react"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "gradient" | "pulse" | "bounce" | "sparkle"
  text?: string
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8",
  xl: "w-12 h-12"
}

export function LoadingSpinner({ 
  className, 
  size = "md", 
  variant = "default",
  text 
}: LoadingSpinnerProps) {
  const baseClasses = cn(sizeMap[size], className)

  const renderSpinner = () => {
    switch (variant) {
      case "gradient":
        return (
          <motion.div
            className={cn(baseClasses, "rounded-full bg-gradient-to-r from-blue-500 to-purple-600")}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              background: `conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)`
            }}
          />
        )
      
      case "pulse":
        return (
          <motion.div
            className={cn(baseClasses, "rounded-full bg-blue-500")}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )
      
      case "bounce":
        return (
          <div className={cn("flex space-x-1", className)}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
        )
      
      case "sparkle":
        return (
          <motion.div
            className={cn(baseClasses, "text-blue-500")}
            animate={{ 
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-full h-full" />
          </motion.div>
        )
      
      default:
        return (
          <Loader2 className={cn(baseClasses, "animate-spin text-blue-500")} />
        )
    }
  }

  if (text) {
    return (
      <div className="flex flex-col items-center gap-3">
        {renderSpinner()}
        <motion.p 
          className="text-sm text-slate-400 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.p>
      </div>
    )
  }

  return renderSpinner()
}

interface SkeletonProps {
  className?: string
  variant?: "default" | "circle" | "rectangle" | "text"
  animation?: "pulse" | "shimmer" | "wave"
}

export function Skeleton({ 
  className, 
  variant = "default",
  animation = "shimmer"
}: SkeletonProps) {
  const variantClasses = {
    default: "rounded-md",
    circle: "rounded-full",
    rectangle: "rounded-none",
    text: "rounded h-4"
  }

  const animationClasses = {
    pulse: "animate-pulse bg-slate-700",
    shimmer: "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200",
    wave: "animate-gradient-x bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200"
  }

  return (
    <div
      className={cn(
        "bg-slate-800",
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
    />
  )
}

interface PageLoadingProps {
  text?: string
  showLogo?: boolean
}

export function PageLoading({ text = "Cargando...", showLogo = true }: PageLoadingProps) {
  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center space-y-6">
        {showLogo && (
          <motion.div
            className="flex items-center justify-center space-x-3"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              delay: 0.2 
            }}
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">CB</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ConcreteBill
            </span>
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <LoadingSpinner variant="gradient" size="lg" />
        </motion.div>
        
        <motion.p 
          className="text-slate-400 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {text}
        </motion.p>
      </div>
    </motion.div>
  )
}

interface LoadingOverlayProps {
  isVisible: boolean
  text?: string
  className?: string
}

export function LoadingOverlay({ 
  isVisible, 
  text = "Procesando...", 
  className 
}: LoadingOverlayProps) {
  if (!isVisible) {
    return null
  }

  return (
    <motion.div
      className={cn(
        "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-slate-900 rounded-xl p-8 shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner variant="gradient" size="lg" />
          <p className="text-slate-300 font-medium">{text}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export { motion }