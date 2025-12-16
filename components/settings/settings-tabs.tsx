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
        "fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-64 xl:w-80 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-700 shadow-xl transform transition-transform duration-300 lg:transform-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between gap-3 mb-3 lg:mb-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 lg:p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-md">
                <Settings className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  Configuración
                </h2>
                <p className="text-xs lg:text-sm text-slate-600 dark:text-slate-400">Personaliza tu experiencia</p>
              </div>
            </div>
            <button 
              className="lg:hidden p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              onClick={() => setIsSidebarOpen(false)}
            >
              ✕
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
            <Input
              placeholder="Buscar configuración..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-300 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 backdrop-blur-sm text-sm"
              variant="modern"
            />
          </div>
        </div>

        <div className="p-3 lg:p-4 space-y-2 overflow-y-auto" style={{maxHeight: 'calc(100vh - 180px)'}}>
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
                  "w-full text-left p-3 lg:p-4 rounded-xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200 dark:from-blue-900/30 dark:to-purple-900/30 dark:text-blue-300 dark:border-blue-700 shadow-md" 
                    : "hover:bg-white/80 hover:shadow-md text-slate-700 border border-transparent hover:border-slate-200 dark:hover:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-700"
                )}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-600 to-purple-600 rounded-r-full"
                    layoutId="activeIndicator"
                  />
                )}
                
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className={cn(
                    "p-1.5 lg:p-2 rounded-lg transition-all duration-300 flex-shrink-0",
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" 
                      : "bg-slate-200 text-slate-600 group-hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-slate-600"
                  )}>
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-xs lg:text-sm truncate">{tab.label}</h3>
                      {tab.badge && (
                        <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex-shrink-0 ml-1">
                          {tab.badge}
                        </span>
                      )}
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-300 flex-shrink-0 ml-1",
                        isActive ? "rotate-90 text-blue-600" : "text-slate-400 group-hover:translate-x-1"
                      )} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 lg:mt-1 line-clamp-2">
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
        className="lg:hidden fixed bottom-4 right-4 z-30 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl"
        onClick={() => setIsSidebarOpen(true)}
      >
        <Settings className="h-6 w-6" />
      </button>

      {/* Content */}
      <div className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 dark:bg-slate-900 overflow-hidden w-full lg:w-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full overflow-auto"
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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent truncate">
              {title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base lg:text-lg mt-1">{description}</p>
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