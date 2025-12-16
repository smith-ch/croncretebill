"use client"
import { X, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { NotificationType } from "./notification-provider"

interface NotificationBannerProps {
  type: NotificationType
  title: string
  description?: string
  onDismiss?: () => void
  className?: string
}

export function NotificationBanner({ type, title, description, onDismiss, className }: NotificationBannerProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return CheckCircle
      case "error":
        return XCircle
      case "warning":
        return AlertCircle
      case "info":
        return Info
      default:
        return Info
    }
  }

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-900 shadow-green-100"
      case "error":
        return "bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-900 shadow-red-100"
      case "warning":
        return "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 text-amber-900 shadow-amber-100"
      case "info":
        return "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300 text-blue-900 shadow-blue-100"
      default:
        return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300 text-gray-900 shadow-gray-100"
    }
  }

  const getIconStyles = () => {
    switch (type) {
      case "success":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "warning":
        return "text-amber-600"
      case "info":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const Icon = getIcon()

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
      className={cn(
        "flex items-start gap-3 p-4 border rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 relative overflow-hidden",
        getStyles(),
        className,
      )}
    >
      {/* Animated background effect */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            'linear-gradient(225deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
      >
        <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", getIconStyles())} />
      </motion.div>
      
      <div className="flex-1 min-w-0 relative z-10">
        <motion.h4
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="font-semibold text-sm"
        >
          {title}
        </motion.h4>
        {description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-1 text-sm opacity-90 leading-relaxed"
          >
            {description}
          </motion.p>
        )}
      </div>
      
      {onDismiss && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 w-7 p-0 hover:bg-black/10 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
