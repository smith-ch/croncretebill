"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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
  Building2,
  Mail,
  Phone,
  MapPin,
  Target,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useStockAlerts } from "@/components/inventory/stock-alerts"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useAuth } from "@/hooks/use-auth"
import { useCompanyData } from "@/hooks/use-company-data"

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

interface CompanyData {
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  tax_id: string
  business_type: string
}

interface ProfileData {
  first_name: string
  last_name: string
  email: string
  avatar_url?: string
}

interface DashboardStats {
  monthlyRevenue: number
  totalClients: number
  monthlyInvoices: number
  pendingInvoices: number
  overdueInvoices: number
  monthlyTarget: number
}

export function MobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const { alertCount } = useStockAlerts()
  const { canAccessModule, permissions } = useUserPermissions()
  const { formatCurrency } = useCurrency()
  
  // Use optimized hooks (must be at top level)
  const { user: authUser, loading: authLoading } = useAuth()
  const { company: companyData, user: userData } = useCompanyData()

  useEffect(() => {
    // Actualizar datos cuando estén disponibles
    if (companyData) setCompany(companyData)
    if (userData) {
      setProfile({
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        email: userData.email || "",
        avatar_url: userData.avatar_url || ""
      })
    }
  }, [companyData, userData])

  useEffect(() => {
    if (!authUser) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Obtener estadísticas del dashboard
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        // Ingresos mensuales
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total, status')
          .eq('user_id', authUser.id)
          .gte('issue_date', startOfMonth.toISOString())
          .lte('issue_date', endOfMonth.toISOString())

        const monthlyRevenue = (invoices as any)?.reduce((sum: number, inv: any) => 
          inv.status === 'paid' ? sum + inv.total : sum, 0) || 0
        
        const monthlyInvoices = invoices?.length || 0
        const pendingInvoices = (invoices as any)?.filter((inv: any) => inv.status === 'pending').length || 0

        // Facturas vencidas
        const { data: overdueInvs } = await supabase
          .from('invoices')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('status', 'pending')
          .lt('due_date', new Date().toISOString())

        const overdueInvoices = overdueInvs?.length || 0

        // Total clientes
        const { count: clientCount } = await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authUser.id)

        // Meta mensual (obtener de localStorage)
        const savedTarget = localStorage.getItem('monthly_target')
        const monthlyTarget = savedTarget ? parseFloat(savedTarget) : 100000

        setStats({
          monthlyRevenue,
          totalClients: clientCount || 0,
          monthlyInvoices,
          pendingInvoices,
          overdueInvoices,
          monthlyTarget
        })

      } catch (error) {
        console.error('Error fetching mobile nav data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authUser])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const monthlyProgress = stats ? (stats.monthlyRevenue / stats.monthlyTarget) * 100 : 0

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
              
              {/* Información de la Empresa y Usuario */}
              <div className="mb-4 pb-3 border-b border-slate-300">
                {/* Información de la empresa */}
                {company && !loading && (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-slate-800 truncate">
                            {company.company_name || "Sin nombre"}
                          </h3>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0 mt-0.5">
                            {company.business_type || "SRL"}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-slate-200 rounded-md transition-all duration-200 flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                        )}
                      </button>
                    </div>

                    {/* Información expandida */}
                    {isExpanded && (
                      <div className="space-y-1.5 pl-2 text-xs text-slate-600 animate-slide-down">
                        {company.company_email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{company.company_email}</span>
                          </div>
                        )}
                        {company.company_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span>{company.company_phone}</span>
                          </div>
                        )}
                        {company.company_address && (
                          <div className="flex items-center gap-2 truncate">
                            <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate text-xs">{company.company_address}</span>
                          </div>
                        )}
                        {company.tax_id && (
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span>RNC: {company.tax_id}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Perfil del usuario */}
                {profile && !loading && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <Avatar className="h-8 w-8 border-2 border-blue-200">
                      <AvatarImage 
                        src={profile.avatar_url} 
                        alt={`${profile.first_name} ${profile.last_name}`} 
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs">
                        {getInitials(profile.first_name, profile.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">
                        {profile.first_name && profile.last_name 
                          ? `${profile.first_name} ${profile.last_name}`
                          : "Usuario"
                        }
                      </p>
                      {permissions.isRealEmployee ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0 h-4 mt-0.5">
                          <span className="mr-1">👤</span> Empleado
                        </Badge>
                      ) : permissions.role === 'employee' ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-1.5 py-0 h-4 mt-0.5">
                          <span className="mr-1">🔄</span> Modo Prueba
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs px-1.5 py-0 h-4 mt-0.5">
                          <span className="mr-1">👑</span> Propietario
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Métricas rápidas */}
                {stats && !loading && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-lg p-2 border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                          <DollarSign className="h-3 w-3 text-blue-500" />
                          <span>Ingresos:</span>
                        </div>
                        <p className="font-bold text-sm text-blue-700 truncate">
                          {formatCurrency(stats.monthlyRevenue)}
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-2 border border-green-100 shadow-sm">
                        <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                          <Users className="h-3 w-3 text-green-500" />
                          <span>Clientes:</span>
                        </div>
                        <p className="font-bold text-sm text-green-700">{stats.totalClients}</p>
                      </div>

                      <div className="bg-white rounded-lg p-2 border border-purple-100 shadow-sm">
                        <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                          <FileText className="h-3 w-3 text-purple-500" />
                          <span>Facturas:</span>
                        </div>
                        <p className="font-bold text-sm text-purple-700">{stats.monthlyInvoices}</p>
                      </div>

                      <div className={cn(
                        "rounded-lg p-2 border shadow-sm",
                        monthlyProgress >= 75 ? "bg-emerald-50 border-emerald-200" : 
                        monthlyProgress >= 50 ? "bg-amber-50 border-amber-200" : 
                        "bg-red-50 border-red-200"
                      )}>
                        <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                          <Target className="h-3 w-3" />
                          <span>Meta:</span>
                        </div>
                        <p className={cn(
                          "font-bold text-sm",
                          monthlyProgress >= 75 ? "text-emerald-700" : 
                          monthlyProgress >= 50 ? "text-amber-700" : 
                          "text-red-700"
                        )}>
                          {monthlyProgress.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {/* Alertas */}
                    {(stats.overdueInvoices > 0 || stats.pendingInvoices > 5) && (
                      <div className="space-y-1.5 mt-2">
                        {stats.overdueInvoices > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 rounded-lg border border-red-200">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-red-700">
                              {stats.overdueInvoices} vencida{stats.overdueInvoices !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {stats.pendingInvoices > 5 && (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-amber-700">
                              {stats.pendingInvoices} pendiente{stats.pendingInvoices !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
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
                        <div className="relative">
                          <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 hover:scale-110" />
                          {item.name === "Sistema - Info" && (
                            <div className="absolute -top-1 -right-1">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-red-500 to-red-500 shadow-lg"></span>
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="font-semibold flex items-center gap-2">
                          {item.name}
                          {item.name === "Sistema - Info" && (
                            <Badge className="bg-gradient-to-r from-red-500 to-red-500 text-white text-[10px] px-1.5 py-0 h-4 animate-pulse shadow-md">
                              AVISO
                            </Badge>
                          )}
                        </span>
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
                      // Limpiar sessionStorage para que la bienvenida aparezca en el próximo login
                      sessionStorage.removeItem('welcomeShown')
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