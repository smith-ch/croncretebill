"use client"

import { useNotifications as useNotificationsContext } from "@/components/notifications/notification-provider"

// Re-export for convenience
export const useNotifications = useNotificationsContext

// Utility functions for common notification patterns
export function useNotificationHelpers() {
  const notifications = useNotificationsContext()

  const notifySuccess = (message: string, options?: { title?: string; duration?: number }) => {
    notifications.showSuccess(message, {
      title: options?.title,
      duration: options?.duration || 4000,
      style: "sonner",
    })
  }

  const notifyError = (message: string, options?: { title?: string; duration?: number }) => {
    notifications.showError(message, {
      title: options?.title || "Error",
      duration: options?.duration || 6000,
      style: "sonner",
    })
  }

  const notifyWarning = (message: string, options?: { title?: string; duration?: number }) => {
    notifications.showWarning(message, {
      title: options?.title || "Advertencia",
      duration: options?.duration || 5000,
      style: "sonner",
    })
  }

  const notifyInfo = (message: string, options?: { title?: string; duration?: number }) => {
    notifications.showInfo(message, {
      title: options?.title || "Información",
      duration: options?.duration || 4000,
      style: "sonner",
    })
  }

  const notifyFormSuccess = (action: string) => {
    notifySuccess(`${action} exitosamente`, { title: "¡Éxito!" })
  }

  const notifyFormError = (action: string, error?: string) => {
    notifyError(error || `Error al ${action.toLowerCase()}`, { title: "Error" })
  }

  const notifyInvoicePaid = (invoiceNumber: string) => {
    notifications.showSuccess(`Factura ${invoiceNumber} marcada como pagada`, {
      title: "¡Pago registrado!",
      style: "sonner",
      duration: 4000,
    })
  }

  const notifyInvoiceCreated = (invoiceNumber: string) => {
    notifications.showSuccess(`Factura ${invoiceNumber} creada exitosamente`, {
      title: "¡Factura creada!",
      style: "sonner",
      duration: 4000,
    })
  }

  return {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyFormSuccess,
    notifyFormError,
    notifyInvoicePaid,
    notifyInvoiceCreated,
    ...notifications,
  }
}
