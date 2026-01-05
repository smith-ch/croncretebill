"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { SidebarHeader } from "@/components/layout/sidebar-header"
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Wrench,
  FolderOpen,
  Calculator,
  TrendingUp,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Menu,
  X,
  LogOut,
  Receipt,
  CreditCard,
  Calendar,
  ClipboardList,
  Warehouse,
  Info,
  UserCog,
  Target,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useStockAlerts } from "@/components/inventory/stock-alerts"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"

const navigation = [
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
    children: [
      {
        name: "Catálogo",
        href: "/products",
        icon: Package,
        module: "products",
      },
      {
        name: "Presupuestos",
        href: "/products/budgets",
        icon: Calculator,
        module: "budgets",
      },
    ],
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
    name: "Recibos",
    href: "/thermal-receipts",
    icon: Receipt,
    module: "thermal-receipts",
    children: [
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
    ],
  },
  {
    name: "Reportes",
    href: "/monthly-reports",
    icon: TrendingUp,
    module: "reports",
    children: [
      {
        name: "Reportes Mensuales",
        href: "/monthly-reports",
        icon: TrendingUp,
        module: "reports",
      },
      {
        name: "Reportes DGII",
        href: "/dgii-reports",
        icon: ClipboardList,
        module: "reports",
      },
    ],
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
    children: [
      {
        name: "General",
        href: "/settings",
        icon: Settings,
        module: "settings",
      },
      {
        name: "Empleados",
        href: "/settings/employee-config",
        icon: UserCog,
        module: "employees",
        ownerOnly: true,
      },
      {
        name: "Metas de Empleados",
        href: "/settings/employee-goals",
        icon: Target,
        module: "employee-goals",
        ownerOnly: true,
      },
      {
        name: "Mi Suscripción",
        href: "/subscriptions/my-subscription",
        icon: CreditCard,
        module: "my-subscription",
      },
      {
        name: "🔐 Suscripciones",
        href: "/subscriptions",
        icon: CreditCard,
        module: "subscriptions",
        subscriptionManagerOnly: true,
      },
    ],
  },
  {
    name: "Ayuda",
    href: "/faq",
    icon: HelpCircle,
    module: "faq",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>(["Productos", "Recibos", "Configuración"])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSubscriptionManager, setIsSubscriptionManager] = useState(false)
  const { alertCount } = useStockAlerts()
  const { canAccessModule, permissions } = useUserPermissions()

  // Verificar si el usuario es subscription manager
  useEffect(() => {
    async function checkSubscriptionManager() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase.rpc('is_subscription_manager', {
          p_user_id: user.id
        })

        if (!error && data) {
          setIsSubscriptionManager(true)
        }
      } catch (error) {
        console.error('Error checking subscription manager:', error)
      }
    }

    checkSubscriptionManager()
  }, [])

  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter(item => {
    if (item.module && !canAccessModule(item.module)) {
      return false
    }
    return true
  })

  // Filter children items based on permissions
  const getFilteredChildren = (children?: typeof navigation[0]['children']) => {
    if (!children) {
      return undefined
    }
    return children.filter(child => {
      // Si el item es solo para owners, verificar que el usuario sea owner
      if ((child as any).ownerOnly && !permissions.isOwner) {
        return false
      }
      // Si el item es solo para subscription managers, verificar
      if ((child as any).subscriptionManagerOnly && !isSubscriptionManager) {
        return false
      }
      return !child.module || canAccessModule(child.module)
    })
  }

  const toggleItem = (name: string) => {
    setOpenItems((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      // Limpiar sessionStorage para que la bienvenida aparezca en el próximo login
      sessionStorage.removeItem('welcomeShown')
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <div
      className={cn(
        "hidden lg:flex h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 transition-all duration-500 ease-in-out shadow-xl backdrop-blur-sm",
        isCollapsed ? "w-16" : "w-80",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 bg-gradient-to-r from-white to-blue-50 shadow-sm">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center shadow-md transform group-hover:scale-110 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25">
              <span className="text-white font-bold text-sm">CB</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent hover:from-blue-700 hover:to-blue-900 transition-all duration-300">
              ConcreteBill
            </span>
          </Link>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="h-8 w-8 p-0 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:scale-110 transition-all duration-300 rounded-lg"
        >
          {isCollapsed ? <Menu className="h-4 w-4 text-slate-600" /> : <X className="h-4 w-4 text-slate-600" />}
        </Button>
      </div>

      {/* Información Empresarial y Métricas */}
      <SidebarHeader isCollapsed={isCollapsed} />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {filteredNavigation.map((item, index) => {
            const filteredChildren = getFilteredChildren(item.children)
            if (item.children && filteredChildren && filteredChildren.length === 0) {
              // If all children are filtered out, don't show parent either
              return null
            }
            
            if (filteredChildren) {
              const isOpen = openItems.includes(item.name)
              const hasActiveChild = filteredChildren.some((child) => isActive(child.href))

              if (isCollapsed) {
                return (
                  <div key={item.name} className="relative group">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-center px-2 py-2 text-left font-normal hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 text-slate-700 transition-all duration-300 rounded-lg transform hover:scale-105 shadow-sm hover:shadow-md animate-fade-in",
                        (isActive(item.href) || hasActiveChild) &&
                          "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-r-2 border-blue-600 shadow-md",
                      )}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="relative">
                        <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                        {item.name === "Inventario" && alertCount > 0 && (
                          <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs px-1 py-0 h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                            {alertCount > 9 ? '9+' : alertCount}
                          </Badge>
                        )}
                      </div>
                    </Button>
                    <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50 animate-slide-in-right">
                      <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-xl p-3 min-w-48 glass">
                        <div className="font-medium text-sm mb-3 text-slate-800 border-b border-slate-200 pb-2">{item.name}</div>
                        {filteredChildren?.map((child, childIndex) => (
                          <Link key={child.href} href={child.href}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start px-3 py-2 text-sm font-normal hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 text-slate-700 transition-all duration-300 rounded-md transform hover:scale-105 animate-fade-in",
                                isActive(child.href) && "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 shadow-sm",
                              )}
                              style={{ animationDelay: `${childIndex * 0.05}s` }}
                            >
                              <child.icon className="h-4 w-4 mr-2 transition-transform duration-300 hover:scale-110" />
                              {child.name}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <Collapsible key={item.name} open={isOpen} onOpenChange={() => toggleItem(item.name)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between px-3 py-2 text-left font-normal hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 text-slate-700 transition-all duration-300 rounded-lg transform hover:scale-[1.02] shadow-sm hover:shadow-md animate-fade-in",
                        (isActive(item.href) || hasActiveChild) &&
                          "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-r-2 border-blue-600 shadow-md",
                      )}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5 transition-transform duration-300 hover:scale-110" />
                        <span className="font-medium">{item.name}</span>
                        {item.name === "Inventario" && alertCount > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0.5 animate-pulse">
                            {alertCount}
                          </Badge>
                        )}
                      </div>
                      <div className={cn("transition-transform duration-300", isOpen && "rotate-180")}>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-6 mt-1 animate-slide-down">
                    {filteredChildren?.map((child, childIndex) => (
                      <Link key={child.href} href={child.href}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start px-3 py-2 text-left font-normal hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 text-slate-600 transition-all duration-300 rounded-lg transform hover:scale-[1.02] animate-fade-in",
                            isActive(child.href) &&
                              "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-r-2 border-blue-600 shadow-sm",
                          )}
                          style={{ animationDelay: `${childIndex * 0.05}s` }}
                        >
                          <child.icon className="h-4 w-4 mr-3 transition-transform duration-300 hover:scale-110" />
                          <span className="font-medium">{child.name}</span>
                        </Button>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            }

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full px-3 py-2 text-left font-normal hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 text-slate-700 transition-all duration-300 rounded-lg transform hover:scale-[1.02] shadow-sm hover:shadow-md animate-fade-in",
                    isCollapsed ? "justify-center" : "justify-start",
                    isActive(item.href) &&
                      "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-r-2 border-blue-600 shadow-md",
                  )}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="relative">
                    <item.icon className={cn("h-5 w-5 transition-transform duration-300 hover:scale-110", !isCollapsed && "mr-3")} />
                    {item.name === "Sistema - Info" && (
                      <div className="absolute -top-1 -right-1">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-red-500 to-red-500 shadow-lg"></span>
                        </span>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="font-medium flex items-center gap-2">
                      {item.name}
                      {item.name === "Sistema - Info" && (
                        <Badge className="bg-gradient-to-r from-red-500 to-red-500 text-white text-[10px] px-1.5 py-0 h-4 animate-pulse shadow-md">
                          AVISO
                        </Badge>
                      )}
                    </span>
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {!isCollapsed && (
        <>
          <Separator className="bg-slate-200" />
          <div className="p-4 bg-gradient-to-r from-white to-blue-50">
            <div className="rounded-lg bg-gradient-to-r from-blue-100 to-blue-200 p-4 text-center border border-blue-300 shadow-md hover:shadow-lg transition-all duration-300 glass backdrop-blur-sm">
              <p className="text-sm font-bold text-blue-800 text-gradient">ConcreteBill Pro</p>
              <p className="text-xs text-blue-600 mt-1 font-medium">Sistema de Facturación</p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-1">
                <div className="bg-gradient-to-r from-blue-500 to-blue-700 h-1 rounded-full animate-gradient-x" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </>
      )}

      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-white to-red-50">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start px-3 py-2 text-left font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 text-red-600 transition-all duration-300 rounded-lg transform hover:scale-[1.02] shadow-sm hover:shadow-md"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      )}
    </div>
  )
}
