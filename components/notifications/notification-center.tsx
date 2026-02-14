"use client"
import { useNotifications } from "./notification-provider"
import { NotificationBanner } from "./notification-banner"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { banners, dismissBanner, clearAllBanners } = useNotifications()

  if (banners.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Notificaciones</span>
          <Badge variant="secondary" className="text-xs">
            {banners.length}
          </Badge>
        </div>
        {banners.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllBanners}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Limpiar todo
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {banners.map((banner) => (
          <NotificationBanner
            key={banner.id}
            type={banner.type}
            title={banner.title}
            description={banner.description}
            onDismiss={() => dismissBanner(banner.id)}
          />
        ))}
      </div>
    </div>
  )
}
