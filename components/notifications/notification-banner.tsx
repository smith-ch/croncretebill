"use client"
import { X, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
        return "bg-green-50 border-green-200 text-green-800 shadow-md"
      case "error":
        return "bg-red-50 border-red-200 text-red-800 shadow-md"
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-800 shadow-md"
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800 shadow-md"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800 shadow-md"
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
    <div
      className={cn(
        "flex items-start gap-3 p-4 border rounded-lg animate-in slide-in-from-top-2 duration-300 relative z-30 bg-opacity-100",
        getStyles(),
        className,
      )}
    >
      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", getIconStyles())} />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{title}</h4>
        {description && <p className="mt-1 text-sm">{description}</p>}
      </div>
      {onDismiss && (
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0 hover:bg-black/10">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
