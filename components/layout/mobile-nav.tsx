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
      {/* Mobile Header - Enhanced Design */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 pwa-header bg-gradient-to-r from-white to-blue-50 backdrop-blur-md border-b border-slate-200 shadow-lg">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25">
              <span className="text-white font-bold text-sm">CB</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent hover:from-blue-700 hover:to-blue-900 transition-all duration-300">
              ConcreteBill
            </span>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-10 w-10 p-0 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:scale-110 transition-all duration-300 rounded-xl"
          >
            {isOpen ? (
              <X className="h-5 w-5 text-slate-700" />
            ) : (
              <Menu className="h-5 w-5 text-slate-700" />
            )}
          </Button>
        </div>

        {/* Mobile Menu Overlay - Enhanced Design with Animations */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-gradient-to-b from-slate-50 to-slate-100 backdrop-blur-xl border-b border-slate-200 shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-down">
            <nav className="px-3 py-4">
              
              {/* Main Navigation with Enhanced Styles */}
              <div className="space-y-1.5 mb-4">
                {mobileNavigation.map((item, index) => {
                  if (item.module && !canAccessModule(item.module)) {
                    return null
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start px-4 py-3 text-left font-medium transition-all duration-300 rounded-xl transform hover:scale-[1.02] shadow-sm hover:shadow-md",
                          isActive(item.href)
                            ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-l-4 border-blue-600 shadow-md hover:shadow-lg"
                            : "text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100"
                        )}
                      >
                        <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 hover:scale-110" />
                        <span className="font-semibold">{item.name}</span>
                        {item.name === "Inventario" && alertCount > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 animate-pulse">
                            {alertCount > 9 ? '9+' : alertCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  )
                })}
              </div>

              {/* Logout Section with Enhanced Design */}
              <div className="border-t border-slate-300 pt-4 mt-4">
                <div className="rounded-xl bg-gradient-to-r from-blue-100 to-blue-200 p-3 mb-3 text-center border border-blue-300 shadow-md">
                  <p className="text-sm font-bold text-blue-800">ConcreteBill Pro</p>
                  <p className="text-xs text-blue-600 mt-0.5 font-medium">Sistema de Facturación</p>
                  <div className="mt-2 w-full bg-blue-200 rounded-full h-1">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-700 h-1 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                
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
                  className="w-full justify-start px-4 py-3 text-left font-semibold text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md"
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