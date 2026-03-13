"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  Target,
  AlertCircle,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  User,
  RefreshCw,
  Crown,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useAuth } from "@/hooks/use-auth"
import { useCompanyData, type CompanyData, type UserData } from "@/hooks/use-company-data"
import { cn } from "@/lib/utils"

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

interface SidebarHeaderProps {
  isCollapsed: boolean
}

export function SidebarHeader({ isCollapsed }: SidebarHeaderProps) {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { formatCurrency } = useCurrency()
  const { permissions } = useUserPermissions()

  // Use optimized hooks instead of direct calls (must be at top level)
  const { user: authUser, loading: authLoading } = useAuth()
  const { company: companyData, user: userData, loading: companyLoading } = useCompanyData()

  useEffect(() => {
    // Actualizar datos de company y profile cuando estén disponibles
    if (companyData) {
      setCompany(companyData)
    }
    if (userData) {
      const userProfile: ProfileData = {
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        email: userData.email || "",
        avatar_url: userData.avatar_url || ""
      }
      setProfile(userProfile)
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

        // Ingresos mensuales (Facturas)
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total, status')
          .eq('user_id', authUser.id)
          .gte('issue_date', startOfMonth.toISOString())
          .lte('issue_date', endOfMonth.toISOString())

        const invoiceRevenue = (invoices as any)?.reduce((sum: number, inv: any) =>
          inv.status === 'paid' ? sum + inv.total : sum, 0) || 0

        const monthlyInvoices = invoices?.length || 0
        const pendingInvoices = (invoices as any)?.filter((inv: any) => inv.status === 'pending').length || 0

        // Ingresos mensuales (Recibos Térmicos)
        const { data: receipts, error: receiptsError } = await supabase
          .from('thermal_receipts')
          .select('total_amount, status')
          .eq('user_id', authUser.id)
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString())
          .neq('status', 'cancelled')

        // Handle thermal_receipts gracefully if table doesn't exist
        const receiptRevenue = receiptsError ? 0 : ((receipts as any)?.reduce((sum: number, receipt: any) =>
          sum + (receipt.total_amount || 0), 0) || 0)

        const monthlyRevenue = invoiceRevenue + receiptRevenue

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

        setLastUpdate(new Date())
      } catch (error) {
        console.error('Error fetching sidebar data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Actualizar cada 5 minutos
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [authUser])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const monthlyProgress = stats ? (stats.monthlyRevenue / stats.monthlyTarget) * 100 : 0

  if (isCollapsed) {
    // Mostrar solo un pequeño indicador cuando está colapsado
    if (loading || !stats) {
      return null
    }

    return (
      <div className="px-2 py-2 border-b border-slate-800 bg-gradient-to-br from-slate-900 via-blue-50/30 to-slate-50">
        <div className="flex flex-col items-center gap-1">
          {/* Indicador de estado en línea */}
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="En línea"></div>
          {/* Indicador de progreso de meta */}
          <div
            className={cn(
              "w-8 h-1 rounded-full",
              monthlyProgress >= 75 ? "bg-emerald-500" :
                monthlyProgress >= 50 ? "bg-amber-500" :
                  "bg-red-500"
            )}
            title={`Meta: ${monthlyProgress.toFixed(0)}%`}
          ></div>
          {/* Indicador de alertas */}
          {stats.overdueInvoices > 0 && (
            <div className="w-2 h-2 bg-red-500 rounded-full" title={`${stats.overdueInvoices} vencidas`}></div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-900/80">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
          <div className="h-3 bg-slate-800 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm">
      {/* Sección de Empresa y Perfil */}
      <div className={cn("transition-all duration-300", isCollapsed ? "p-2" : "px-3 py-2 space-y-2")}>
        {/* Información de la empresa */}
        {company && (
          isCollapsed ? (
            <div className="flex justify-center mb-2">
              <div className="p-1.5 bg-slate-800 rounded-lg border border-slate-700/50" title={company.company_name}>
                <Building2 className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="p-1.5 bg-slate-800 rounded-lg flex-shrink-0 border border-slate-700/50">
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-200 truncate leading-none">
                      {company.company_name || "Sin nombre"}
                    </h3>
                    <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] px-1.5 py-0 mt-1 w-fit">
                      {company.business_type || "SRL"}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-slate-800/50 rounded-md transition-all duration-200 flex-shrink-0 hover:scale-110"
                  aria-label={isExpanded ? "Contraer información" : "Expandir información"}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200" />
                  )}
                </button>
              </div>

              {/* Información expandida de la empresa */}
              {isExpanded && (
                <div className="space-y-1.5 pl-2 text-xs text-slate-400 animate-slide-down pt-1">
                  {company.company_email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3 w-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{company.company_email}</span>
                    </div>
                  )}
                  {company.company_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-slate-500 flex-shrink-0" />
                      <span>{company.company_phone}</span>
                    </div>
                  )}
                  {company.company_address && (
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="h-3 w-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{company.company_address}</span>
                    </div>
                  )}
                  {company.tax_id && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-slate-500 flex-shrink-0" />
                      <span>RNC: {company.tax_id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* Perfil del usuario */}
        {profile && (
          isCollapsed ? (
            <div className="flex justify-center pt-2 border-t border-slate-800/50">
              <Avatar className="h-8 w-8 border-2 border-slate-700 shadow-sm" title={`${profile.first_name} ${profile.last_name}`}>
                <AvatarImage
                  src={profile.avatar_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                />
                <AvatarFallback className="bg-slate-800 text-slate-300 font-semibold text-xs">
                  {getInitials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-2.5 border-t border-slate-800/50">
              <Avatar className="h-9 w-9 border-2 border-slate-700 shadow-sm">
                <AvatarImage
                  src={profile.avatar_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                />
                <AvatarFallback className="bg-slate-800 text-slate-300 font-semibold text-xs">
                  {getInitials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs sm:text-sm text-slate-200 truncate leading-none mb-1">
                  {profile.first_name && profile.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : "Usuario"
                  }
                </p>
                {permissions.isRealEmployee ? (
                  <Badge className="bg-green-900/50 text-green-400 border-green-800 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 w-fit">
                    <User className="h-2.5 w-2.5" /> <span className="truncate">Empleado</span>
                  </Badge>
                ) : permissions.role === 'employee' ? (
                  <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 w-fit">
                    <RefreshCw className="h-2.5 w-2.5" /> <span className="truncate">Modo Prueba</span>
                  </Badge>
                ) : (
                  <Badge className="bg-amber-900/50 text-amber-400 border-amber-800 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 w-fit">
                    <Crown className="h-2.5 w-2.5" /> <span className="truncate">Propietario</span>
                  </Badge>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Métricas clave - Only show if not collapsed */}
      {stats && !isCollapsed && (
        <div className="px-3 py-3 bg-slate-900/90 border-t border-slate-800 space-y-2">
          {/* Estado en línea y última actualización */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-900/20 rounded-full border border-emerald-800/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-emerald-400">En línea</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="h-3 w-3" />
              <span>{lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Métricas en grid responsive */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 hover:bg-slate-800 transition-colors duration-200">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <DollarSign className="h-3 w-3 text-blue-400" />
                <span>Ingresos</span>
              </div>
              <p className="font-bold text-xs sm:text-sm text-blue-400 truncate tracking-tight">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 hover:bg-slate-800 transition-colors duration-200">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Users className="h-3 w-3 text-emerald-400" />
                <span>Clientes</span>
              </div>
              <p className="font-bold text-xs sm:text-sm text-emerald-400 truncate">
                {stats.totalClients}
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 hover:bg-slate-800 transition-colors duration-200">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <FileText className="h-3 w-3 text-purple-400" />
                <span>Facturas</span>
              </div>
              <p className="font-bold text-xs sm:text-sm text-purple-400 truncate">
                {stats.monthlyInvoices}
              </p>
            </div>

            <div className={cn(
              "rounded-lg p-2 border transition-colors duration-200",
              monthlyProgress >= 75 ? "bg-emerald-900/10 border-emerald-800/30 hover:bg-emerald-900/20" :
                monthlyProgress >= 50 ? "bg-amber-900/10 border-amber-800/30 hover:bg-amber-900/20" :
                  "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
            )}>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Target className="h-3 w-3" />
                <span>Meta</span>
              </div>
              <div className="flex items-baseline gap-1">
                <p className={cn(
                  "font-bold text-xs sm:text-sm truncate",
                  monthlyProgress >= 75 ? "text-emerald-400" :
                    monthlyProgress >= 50 ? "text-amber-400" :
                      "text-slate-200"
                )}>
                  {monthlyProgress.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {(stats.overdueInvoices > 0 || stats.pendingInvoices > 5) && (
            <div className="space-y-1.5 pt-1">
              {stats.overdueInvoices > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-red-900/20 rounded-lg border border-red-800/30">
                  <AlertCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium text-red-300">
                    {stats.overdueInvoices} facturas vencidas
                  </span>
                </div>
              )}
              {stats.pendingInvoices > 5 && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-900/20 rounded-lg border border-amber-800/30">
                  <Clock className="h-3 w-3 text-amber-400 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium text-amber-300">
                    {stats.pendingInvoices} facturas pendientes
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
