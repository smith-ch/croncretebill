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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useAuth } from "@/hooks/use-auth"
import { useCompanyData } from "@/hooks/use-company-data"
import { cn } from "@/lib/utils"

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
      <div className="px-3 py-2 space-y-2">
        {/* Información de la empresa */}
        {company && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="p-1 bg-slate-800 rounded-md flex-shrink-0 border border-slate-700/50">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-slate-200 truncate">
                    {company.company_name || "Sin nombre"}
                  </h3>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] px-1 py-0 mt-0.5">
                    {company.business_type || "SRL"}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 hover:bg-slate-800/50 rounded-md transition-all duration-200 flex-shrink-0 hover:scale-110"
                aria-label={isExpanded ? "Contraer información" : "Expandir información"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 text-slate-400 transition-transform duration-200" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-slate-400 transition-transform duration-200" />
                )}
              </button>
            </div>

            {/* Información expandida de la empresa */}
            {isExpanded && (
              <div className="space-y-1 pl-1.5 text-[10px] text-slate-400 animate-slide-down">
                {company.company_email && (
                  <div className="flex items-center gap-1 truncate">
                    <Mail className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{company.company_email}</span>
                  </div>
                )}
                {company.company_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />
                    <span>{company.company_phone}</span>
                  </div>
                )}
                {company.company_address && (
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate text-[9px]">{company.company_address}</span>
                  </div>
                )}
                {company.tax_id && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />
                    <span>RNC: {company.tax_id}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Perfil del usuario */}
        {profile && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/50">
            <Avatar className="h-7 w-7 border-2 border-slate-700">
              <AvatarImage 
                src={profile.avatar_url} 
                alt={`${profile.first_name} ${profile.last_name}`} 
              />
              <AvatarFallback className="bg-slate-800 text-slate-300 font-semibold text-[10px]">
                {getInitials(profile.first_name, profile.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[10px] text-slate-200 truncate">
                {profile.first_name && profile.last_name 
                  ? `${profile.first_name} ${profile.last_name}`
                  : "Usuario"
                }
              </p>
              {permissions.isRealEmployee ? (
                <Badge className="bg-green-900/50 text-green-400 border-green-800 text-[8px] px-1 py-0 h-3.5 mt-0.5">
                  <span className="mr-0.5">👤</span> Empleado
                </Badge>
              ) : permissions.role === 'employee' ? (
                <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[8px] px-1 py-0 h-3.5 mt-0.5">
                  <span className="mr-0.5">🔄</span> Modo Prueba
                </Badge>
              ) : (
                <Badge className="bg-amber-900/50 text-amber-400 border-amber-800 text-[8px] px-1 py-0 h-3.5 mt-0.5">
                  <span className="mr-0.5">👑</span> Propietario
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Métricas clave */}
      {stats && (
        <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 space-y-1.5">
          {/* Estado en línea y última actualización */}
          <div className="flex items-center justify-between text-[9px]">
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-900/30 rounded border border-green-800">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-green-400">En línea</span>
            </div>
            <div className="flex items-center gap-0.5 text-slate-400">
              <Clock className="h-2.5 w-2.5" />
              <span>{lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Métricas en grid compacto */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-slate-800 rounded-md p-1.5 border border-slate-700">
              <div className="flex items-center gap-0.5 text-[9px] text-slate-400 mb-0.5">
                <DollarSign className="h-2.5 w-2.5 text-blue-400" />
                <span>Ingresos:</span>
              </div>
              <p className="font-bold text-[11px] text-blue-400 truncate">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>

            <div className="bg-slate-800 rounded-md p-1.5 border border-slate-700">
              <div className="flex items-center gap-0.5 text-[9px] text-slate-400 mb-0.5">
                <Users className="h-2.5 w-2.5 text-green-400" />
                <span>Clientes:</span>
              </div>
              <p className="font-bold text-[11px] text-green-400">{stats.totalClients}</p>
            </div>

            <div className="bg-slate-800 rounded-md p-1.5 border border-slate-700">
              <div className="flex items-center gap-0.5 text-[9px] text-slate-400 mb-0.5">
                <FileText className="h-2.5 w-2.5 text-purple-400" />
                <span>Facturas:</span>
              </div>
              <p className="font-bold text-[11px] text-purple-400">{stats.monthlyInvoices}</p>
            </div>

            <div className={cn(
              "rounded-md p-1.5 border",
              monthlyProgress >= 75 ? "bg-emerald-900/30 border-emerald-800" : 
              monthlyProgress >= 50 ? "bg-amber-900/30 border-amber-800" : 
              "bg-red-900/30 border-red-800"
            )}>
              <div className="flex items-center gap-0.5 text-[9px] text-slate-400 mb-0.5">
                <Target className="h-2.5 w-2.5" />
                <span>Meta:</span>
              </div>
              <p className={cn(
                "font-bold text-[11px]",
                monthlyProgress >= 75 ? "text-emerald-400" : 
                monthlyProgress >= 50 ? "text-amber-400" : 
                "text-red-400"
              )}>
                {monthlyProgress.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Alertas */}
          {(stats.overdueInvoices > 0 || stats.pendingInvoices > 5) && (
            <div className="space-y-1">
              {stats.overdueInvoices > 0 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-900/30 rounded border border-red-800">
                  <AlertCircle className="h-2.5 w-2.5 text-red-400 flex-shrink-0" />
                  <span className="text-[9px] font-semibold text-red-400">
                    {stats.overdueInvoices} vencida{stats.overdueInvoices !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {stats.pendingInvoices > 5 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-900/30 rounded border border-amber-800">
                  <Clock className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                  <span className="text-[9px] font-semibold text-amber-400">
                    {stats.pendingInvoices} pendiente{stats.pendingInvoices !== 1 ? 's' : ''}
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
