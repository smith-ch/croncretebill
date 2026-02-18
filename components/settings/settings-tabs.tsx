"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  User,
  Building2,
  Settings,
  CreditCard,
  Shield,
  Bell,
  Palette,
  Download,
  Search,
  ChevronRight
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface SettingsTab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: string
}

interface SettingsTabsProps {
  tabs: SettingsTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode
  className?: string
}

export function SettingsTabs({
  tabs,
  activeTab,
  onTabChange,
  children,
  className
}: SettingsTabsProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  const filteredTabs = tabs.filter(tab =>
    tab.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tab.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={cn("flex h-full relative", className)}>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-64 xl:w-80 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 shadow-xl transform transition-transform duration-300 lg:transform-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 lg:p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 mb-3 lg:mb-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 lg:p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-md">
                <Settings className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  Configuración
                </h2>
                <p className="text-xs lg:text-sm text-slate-400">Personaliza tu experiencia</p>
              </div>
            </div>
            <button
              className="lg:hidden p-2 hover:bg-slate-800 text-slate-400 rounded-lg"
              onClick={() => setIsSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
            <Input
              placeholder="Buscar configuración..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-700 bg-slate-950/50 text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 backdrop-blur-sm text-sm"
              variant="default"
            />
          </div>
        </div>

        <div className="p-3 lg:p-4 space-y-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {filteredTabs.map((tab, index) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id)
                  setIsSidebarOpen(false)
                }}
                className={cn(
                  "w-full text-left p-3 lg:p-4 rounded-xl transition-all duration-300 group relative overflow-hidden border border-transparent",
                  isActive
                    ? "bg-blue-600/10 border-blue-500/20 shadow-lg shadow-blue-500/10"
                    : "hover:bg-slate-800/50 hover:border-slate-700/50 text-slate-400 hover:text-slate-200"
                )}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full"
                    layoutId="activeIndicator"
                  />
                )}

                <div className="flex items-center gap-2 lg:gap-3">
                  <div className={cn(
                    "p-1.5 lg:p-2 rounded-lg transition-all duration-300 flex-shrink-0",
                    isActive
                      ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg"
                      : "bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300"
                  )}>
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={cn(
                        "font-semibold text-xs lg:text-sm truncate transition-colors",
                        isActive ? "text-blue-100" : "text-slate-300 group-hover:text-white"
                      )}>{tab.label}</h3>
                      {tab.badge && (
                        <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-full flex-shrink-0 ml-1">
                          {tab.badge}
                        </span>
                      )}
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-300 flex-shrink-0 ml-1",
                        isActive ? "rotate-90 text-blue-400" : "text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1"
                      )} />
                    </div>
                    <p className={cn(
                      "text-xs mt-0.5 lg:mt-1 line-clamp-2 transition-colors",
                      isActive ? "text-blue-200/60" : "text-slate-500 group-hover:text-slate-400"
                    )}>
                      {tab.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed bottom-4 left-4 z-30 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:scale-105 transition-transform"
        onClick={() => setIsSidebarOpen(true)}
      >
        <Settings className="h-6 w-6" />
      </button>

      {/* Content */}
      <div className="flex-1 bg-transparent overflow-hidden w-full lg:w-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full overflow-auto custom-scrollbar"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

interface SettingsSectionProps {
  title: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  className
}: SettingsSectionProps) {
  return (
    <div className={cn("p-4 sm:p-6 lg:p-8", className)}>
      <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center gap-3 lg:gap-4">
          {Icon && (
            <div className="p-2 lg:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl lg:rounded-2xl shadow-lg flex-shrink-0">
              <Icon className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent truncate">
              {title}
            </h1>
            <p className="text-slate-400 dark:text-slate-400 text-sm sm:text-base lg:text-lg mt-1">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export const DEFAULT_SETTINGS_TABS: SettingsTab[] = [
  {
    id: "profile",
    label: "Perfil Personal",
    icon: User,
    description: "Información personal, avatar y preferencias de cuenta"
  },
  {
    id: "company",
    label: "Empresa",
    icon: Building2,
    description: "Datos de la empresa, logo y configuración fiscal"
  },
  {
    id: "billing",
    label: "Facturación",
    icon: CreditCard,
    description: "Configuración de facturas, numeración e impuestos"
  },
  {
    id: "system",
    label: "Sistema",
    icon: Settings,
    description: "Tema, idioma, zona horaria y configuraciones generales"
  },
  {
    id: "security",
    label: "Seguridad",
    icon: Shield,
    description: "Contraseña, autenticación de dos factores y sesiones"
  },
  {
    id: "notifications",
    label: "Notificaciones",
    icon: Bell,
    description: "Alertas por email, recordatorios y configuración de avisos"
  },
  {
    id: "appearance",
    label: "Apariencia",
    icon: Palette,
    description: "Tema visual, colores personalizados y diseño"
  },
  {
    id: "backup",
    label: "Respaldo",
    icon: Download,
    description: "Exportación de datos, copias de seguridad e importación"
  }
]