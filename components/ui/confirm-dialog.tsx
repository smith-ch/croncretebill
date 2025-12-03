import React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Trash2, Info, CheckCircle } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (_isOpen: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: "danger" | "warning" | "info" | "success"
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "danger",
  isLoading = false
}: ConfirmDialogProps) {
  const icons = {
    danger: Trash2,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle
  }

  const colors = {
    danger: "text-red-600 bg-red-50 dark:bg-red-900/20",
    warning: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    info: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    success: "text-green-600 bg-green-50 dark:bg-green-900/20"
  }

  const buttonColors = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-yellow-600 hover:bg-yellow-700",
    info: "bg-blue-600 hover:bg-blue-700",
    success: "bg-green-600 hover:bg-green-700"
  }

  const Icon = icons[variant]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`rounded-full p-3 ${colors[variant]}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left mb-2">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isLoading}
            className={buttonColors[variant]}
          >
            {isLoading ? "Procesando..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
