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
  
  const filteredTabs = tabs.filter(tab => 
    tab.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tab.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={cn("flex h-full", className)}>
      {/* Sidebar */}
      <div className="w-80 bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 shadow-xl">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-md">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Configuración
              </h2>
              <p className="text-sm text-slate-600">Personaliza tu experiencia</p>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Buscar configuración..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-300 bg-white/80 backdrop-blur-sm"
              variant="modern"
            />
          </div>
        </div>

        <div className="p-4 space-y-2">
          {filteredTabs.map((tab, index) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 shadow-md border border-blue-200" 
                    : "hover:bg-white/80 hover:shadow-md text-slate-700 border border-transparent hover:border-slate-200"
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
                
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" 
                      : "bg-slate-200 text-slate-600 group-hover:bg-slate-300"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{tab.label}</h3>
                      {tab.badge && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          {tab.badge}
                        </span>
                      )}
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-300",
                        isActive ? "rotate-90 text-blue-600" : "text-slate-400 group-hover:translate-x-1"
                      )} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {tab.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
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
    <div className={cn("p-8", className)}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
              <Icon className="h-8 w-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-slate-600 text-lg mt-1">{description}</p>
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