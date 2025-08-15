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
    name: "Reportes",
    href: "/monthly-reports",
    icon: TrendingUp,
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
  const [openItems, setOpenItems] = useState<string[]>(["Productos"])
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
        "flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CB</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              ConcreteBill
            </span>
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 p-0">
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            if (item.children) {
              const isOpen = openItems.includes(item.name)
              const hasActiveChild = item.children.some((child) => isActive(child.href))

              if (isCollapsed) {
                return (
                  <div key={item.name} className="relative group">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-center px-2 py-2 text-left font-normal hover:bg-gray-100",
                        (isActive(item.href) || hasActiveChild) &&
                          "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-2 border-blue-600",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Button>
                    <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
                      <div className="bg-white border border-gray-200 rounded-md shadow-lg p-2 min-w-48">
                        <div className="font-medium text-sm mb-2">{item.name}</div>
                        {item.children.map((child) => (
                          <Link key={child.href} href={child.href}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start px-2 py-1 text-sm font-normal hover:bg-gray-100",
                                isActive(child.href) && "bg-blue-50 text-blue-700",
                              )}
                            >
                              <child.icon className="h-4 w-4 mr-2" />
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
                        "w-full justify-between px-3 py-2 text-left font-normal hover:bg-gray-100",
                        (isActive(item.href) || hasActiveChild) &&
                          "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-2 border-blue-600",
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-6 mt-1">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start px-3 py-2 text-left font-normal hover:bg-gray-100",
                            isActive(child.href) &&
                              "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-2 border-blue-600",
                          )}
                        >
                          <child.icon className="h-4 w-4 mr-3" />
                          {child.name}
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
                    "w-full px-3 py-2 text-left font-normal hover:bg-gray-100",
                    isCollapsed ? "justify-center" : "justify-start",
                    isActive(item.href) &&
                      "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-2 border-blue-600",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {!isCollapsed && (
        <>
          <Separator />
          <div className="p-4">
            <div className="rounded-lg bg-gradient-to-r from-blue-100 to-slate-100 p-3 text-center">
              <p className="text-sm font-medium text-blue-800">ConcreteBill Pro</p>
              <p className="text-xs text-blue-600 mt-1">Sistema de Facturación</p>
            </div>
          </div>
        </>
      )}

      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start px-3 py-2 text-left font-normal hover:bg-red-50 hover:text-red-700 text-red-600"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      )}
    </div>
  )
}
