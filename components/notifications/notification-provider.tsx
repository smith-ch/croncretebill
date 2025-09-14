"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { toast } from "@/hooks/use-toast"
import { toast as sonnerToast } from "sonner"
import { CheckCircle, XCircle, AlertCircle, Info, Bell } from "lucide-react"

export type NotificationType = "success" | "error" | "warning" | "info"
export type NotificationStyle = "toast" | "sonner" | "banner"

interface NotificationOptions {
  title?: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  style?: NotificationStyle
}

interface BannerNotification {
  id: string
  type: NotificationType
  title: string
  description?: string
  timestamp: Date
  dismissed: boolean
}

interface NotificationContextType {
  // Toast notifications
  showSuccess: (message: string, options?: NotificationOptions) => void
  showError: (message: string, options?: NotificationOptions) => void
  showWarning: (message: string, options?: NotificationOptions) => void
  showInfo: (message: string, options?: NotificationOptions) => void

  // Banner notifications
  banners: BannerNotification[]
  addBanner: (type: NotificationType, title: string, description?: string) => void
  dismissBanner: (id: string) => void
  clearAllBanners: () => void

  // Utility functions
  showNotification: (type: NotificationType, message: string, options?: NotificationOptions) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [banners, setBanners] = useState<BannerNotification[]>([])

  const getIcon = (type: NotificationType) => {
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
        return Bell
    }
  }

  const showToastNotification = useCallback(
    (type: NotificationType, message: string, options: NotificationOptions = {}) => {
      const { title, description, duration = 5000, action, style = "toast" } = options
      const Icon = getIcon(type)

      if (style === "sonner") {
        switch (type) {
          case "success":
            sonnerToast.success(title || message, {
              description: description || (title ? message : undefined),
              duration,
              action: action
                ? {
                    label: action.label,
                    onClick: action.onClick,
                  }
                : undefined,
            })
            break
          case "error":
            sonnerToast.error(title || message, {
              description: description || (title ? message : undefined),
              duration,
              action: action
                ? {
                    label: action.label,
                    onClick: action.onClick,
                  }
                : undefined,
            })
            break
          case "warning":
            sonnerToast.warning(title || message, {
              description: description || (title ? message : undefined),
              duration,
              action: action
                ? {
                    label: action.label,
                    onClick: action.onClick,
                  }
                : undefined,
            })
            break
          case "info":
            sonnerToast.info(title || message, {
              description: description || (title ? message : undefined),
              duration,
              action: action
                ? {
                    label: action.label,
                    onClick: action.onClick,
                  }
                : undefined,
            })
            break
        }
      } else {
        // Use custom toast system
        const iconElement = (
          <Icon
            className={`h-4 w-4 ${
              type === "success"
                ? "text-green-600"
                : type === "error"
                  ? "text-red-600"
                  : type === "warning"
                    ? "text-amber-600"
                    : "text-blue-600"
            }`}
          />
        )
        
        toast({
          title: title || message,
          description: description || (title ? message : undefined),
          variant: type === "error" ? "destructive" : "default",
          duration,
        })
      }
    },
    [],
  )

  const showSuccess = useCallback(
    (message: string, options?: NotificationOptions) => {
      showToastNotification("success", message, options)
    },
    [showToastNotification],
  )

  const showError = useCallback(
    (message: string, options?: NotificationOptions) => {
      showToastNotification("error", message, options)
    },
    [showToastNotification],
  )

  const showWarning = useCallback(
    (message: string, options?: NotificationOptions) => {
      showToastNotification("warning", message, options)
    },
    [showToastNotification],
  )

  const showInfo = useCallback(
    (message: string, options?: NotificationOptions) => {
      showToastNotification("info", message, options)
    },
    [showToastNotification],
  )

  const showNotification = useCallback(
    (type: NotificationType, message: string, options?: NotificationOptions) => {
      showToastNotification(type, message, options)
    },
    [showToastNotification],
  )

  const addBanner = useCallback((type: NotificationType, title: string, description?: string) => {
    const newBanner: BannerNotification = {
      id: `banner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      timestamp: new Date(),
      dismissed: false,
    }
    setBanners((prev) => [newBanner, ...prev])
  }, [])

  const dismissBanner = useCallback((id: string) => {
    setBanners((prev) => prev.map((banner) => (banner.id === id ? { ...banner, dismissed: true } : banner)))
    // Remove dismissed banners after animation
    setTimeout(() => {
      setBanners((prev) => prev.filter((banner) => banner.id !== id))
    }, 300)
  }, [])

  const clearAllBanners = useCallback(() => {
    setBanners([])
  }, [])

  const value: NotificationContextType = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    banners: banners.filter((banner) => !banner.dismissed),
    addBanner,
    dismissBanner,
    clearAllBanners,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
