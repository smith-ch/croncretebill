"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { toast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

export type NotificationType = "success" | "error" | "warning" | "info"
export type NotificationStyle = "toast" | "banner"

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

/* eslint-disable */
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
/* eslint-enable */

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [banners, setBanners] = useState<BannerNotification[]>([])

  const showToastNotification = useCallback(
    (type: NotificationType, message: string, options: NotificationOptions = {}) => {
      const { title, description, duration = 5000, action } = options

      // Map notification types to toast variants
      let variant: "default" | "destructive" | "success" | "warning" | "info" = "default"

      switch (type) {
        case "error":
          variant = "destructive"
          break
        case "success":
          variant = "success"
          break
        case "warning":
          variant = "warning"
          break
        case "info":
          variant = "info"
          break
      }

      toast({
        title: title || message,
        description: description || (title ? message : undefined),
        variant: variant,
        duration,
        action: action ? (
          <ToastAction altText={action.label} onClick={action.onClick}>
            {action.label}
          </ToastAction>
        ) : undefined,
      })
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
