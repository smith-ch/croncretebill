"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Wrench,
  FolderOpen,
  TrendingUp,
  Settings,
  DollarSign,
  Warehouse,
  Menu,
  X,
  Calendar,
  Receipt,
  CreditCard,
  FileBarChart,
  HelpCircle,
  Calculator,
  Info,
} from "lucide-react"
import { useStockAlerts } from "@/components/inventory/stock-alerts"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"

const mobileNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard", 
    icon: LayoutDashboard,
    module: "dashboard",
  },
  {
    name: "Facturas",
    href: "/invoices",
    icon: FileText,
    module: "invoices",
  },
  {
    name: "Clientes", 
    href: "/clients",
    icon: Users,
    module: "clients",
  },
  {
    name: "Productos",
    href: "/products",
    icon: Package,
    module: "products",
  },
  {
    name: "Inventario",
    href: "/inventory",
    icon: Warehouse, 
    module: "inventory",
  },
  {
    name: "Servicios",
    href: "/services",
    icon: Wrench,
    module: "services",
  },
  {
    name: "Proyectos",
    href: "/projects",
    icon: FolderOpen,
    module: "projects",
  },
  {
    name: "Gastos",
    href: "/expenses",
    icon: DollarSign,
    module: "expenses",
  },
  {
    name: "Agenda",
    href: "/agenda", 
    icon: Calendar,
    module: "agenda",
  },
  {
    name: "Recibos Térmicos",
    href: "/thermal-receipts",
    icon: Receipt,
    module: "thermal-receipts",
  },
  {
    name: "Comprobantes de Pago",
    href: "/payment-receipts",
    icon: CreditCard,
    module: "payment-receipts",
  },
  {
    name: "Reportes Mensuales",
    href: "/monthly-reports",
    icon: TrendingUp,
    module: "reports",
  },
  {
    name: "Reportes DGII", 
    href: "/dgii-reports",
    icon: FileBarChart,
    module: "reports",
  },
  {
    name: "DGII - IR2", 
    href: "/dgii-reports/ir2",
    icon: Calculator,
    module: "reports",
  },
  {
    name: "DGII Acumulativo", 
    href: "/dgii-reports/acumulativo",
    icon: TrendingUp,
    module: "reports",
  },
  {
    name: "Presupuestos",
    href: "/products/budgets",
    icon: Calculator,
    module: "budgets",
  },
  {
    name: "Sistema - Info",
    href: "/system-info",
    icon: Info,
    module: "system",
  },
  {
    name: "Configuración",
    href: "/settings",
    icon: Settings,
    module: "settings",
  },
  {
    name: "Ayuda",
    href: "/faq",
    icon: HelpCircle,
    module: "faq",
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { alertCount } = useStockAlerts()
  const { canAccessModule } = useUserPermissions()

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 pwa-header bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">CB</span>
            </div>
            <span className="text-lg font-bold text-gray-900">ConcreteBill</span>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-10 w-10 p-0"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu Overlay - Complete Navigation */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xl max-h-[80vh] overflow-y-auto">
            <nav className="px-4 py-4">
              
              {/* Main Navigation */}
              <div className="space-y-1 mb-4">
                {mobileNavigation.map((item) => {
                  if (item.module && !canAccessModule(item.module)) {
                    return null
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start px-3 py-3 text-left font-medium transition-all duration-200 rounded-lg",
                          isActive(item.href)
                            ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span>{item.name}</span>
                        {item.name === "Inventario" && alertCount > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs">
                            {alertCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  )
                })}
              </div>

              {/* Logout Section */}
              <div className="border-t border-gray-200 pt-4">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const { supabase } = await import("@/lib/supabase")
                      await supabase.auth.signOut()
                      setIsOpen(false)
                    } catch (error) {
                      console.error("Error logging out:", error)
                    }
                  }}
                  className="w-full justify-start px-3 py-3 text-left font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>


    </>
  )
}