"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
} from "lucide-react"
import { supabase } from "@/lib/supabase"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Facturas",
    href: "/invoices",
    icon: FileText,
  },
  {
    name: "Clientes",
    href: "/clients",
    icon: Users,
  },
  {
    name: "Productos",
    href: "/products",
    icon: Package,
    children: [
      {
        name: "Catálogo",
        href: "/products",
        icon: Package,
      },
      {
        name: "Presupuestos",
        href: "/products/budgets",
        icon: Calculator,
      },
    ],
  },
  {
    name: "Servicios",
    href: "/services",
    icon: Wrench,
  },
  {
    name: "Proyectos",
    href: "/projects",
    icon: FolderOpen,
  },
  {
    name: "Gastos",
    href: "/expenses",
    icon: DollarSign,
  },
  {
    name: "Agenda",
    href: "/agenda",
    icon: Calendar,
  },
  {
    name: "Recibos",
    href: "/thermal-receipts",
    icon: Receipt,
    children: [
      {
        name: "Recibos Térmicos",
        href: "/thermal-receipts",
        icon: Receipt,
      },
      {
        name: "Comprobantes de Pago",
        href: "/payment-receipts",
        icon: CreditCard,
      },
    ],
  },
  {
    name: "Reportes",
    href: "/monthly-reports",
    icon: TrendingUp,
    children: [
      {
        name: "Reportes Mensuales",
        href: "/monthly-reports",
        icon: TrendingUp,
      },
      {
        name: "Reportes DGII",
        href: "/dgii-reports",
        icon: ClipboardList,
      },
    ],
  },
  {
    name: "Configuración",
    href: "/settings",
    icon: Settings,
  },
  {
    name: "Ayuda",
    href: "/faq",
    icon: HelpCircle,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>(["Productos", "Recibos"])
  const [isCollapsed, setIsCollapsed] = useState(false)

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
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 transition-all duration-500 ease-in-out shadow-xl backdrop-blur-sm",
        isCollapsed ? "w-16" : "w-64",
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

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item, index) => {
            if (item.children) {
              const isOpen = openItems.includes(item.name)
              const hasActiveChild = item.children.some((child) => isActive(child.href))

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
                      <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    </Button>
                    <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50 animate-slide-in-right">
                      <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-xl p-3 min-w-48 glass">
                        <div className="font-medium text-sm mb-3 text-slate-800 border-b border-slate-200 pb-2">{item.name}</div>
                        {item.children.map((child, childIndex) => (
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
                      </div>
                      <div className={cn("transition-transform duration-300", isOpen && "rotate-180")}>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-6 mt-1 animate-slide-down">
                    {item.children.map((child, childIndex) => (
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
                  <item.icon className={cn("h-5 w-5 transition-transform duration-300 hover:scale-110", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
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
