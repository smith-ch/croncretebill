"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe,
  FileText,
  Settings,
  Crown
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"

interface CompanyData {
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  company_website: string
  tax_id: string
  company_logo?: string
  currency_symbol: string
  business_type: string
}

interface ProfileData {
  first_name: string
  last_name: string
  email: string
  avatar_url?: string
  phone?: string
}

export function CompanyProfileWidget() {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompanyAndProfile()
  }, [])

  const fetchCompanyAndProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('Auth error:', authError)
        setLoading(false)
        return
      }

      // Obtener configuración de empresa
      const { data: companyData, error: companyError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!companyError && companyData) {
        setCompany(companyData)
      }

      // Obtener datos del perfil desde user metadata
      const userProfile: ProfileData = {
        first_name: user.user_metadata?.first_name || "",
        last_name: user.user_metadata?.last_name || "",
        email: user.email || "",
        avatar_url: user.user_metadata?.avatar_url || "",
        phone: user.user_metadata?.phone || ""
      }

      setProfile(userProfile)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-slate-50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Información Empresarial
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Sección de Empresa */}
          {company && (
            <div className="p-6 border-b border-blue-100">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 text-lg">
                      {company.company_name || "Sin nombre configurado"}
                    </h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      {company.business_type || "Empresa"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                    {company.company_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{company.company_email}</span>
                      </div>
                    )}
                    {company.company_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{company.company_phone}</span>
                      </div>
                    )}
                    {company.company_address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{company.company_address}</span>
                      </div>
                    )}
                    {company.tax_id && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span>RNC: {company.tax_id}</span>
                      </div>
                    )}
                  </div>

                  {company.company_website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <a 
                        href={company.company_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {company.company_website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sección de Perfil */}
          {profile && (
            <div className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border-2 border-blue-200">
                  <AvatarImage 
                    src={profile.avatar_url} 
                    alt={`${profile.first_name} ${profile.last_name}`} 
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                    {getInitials(profile.first_name, profile.last_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800">
                      {profile.first_name && profile.last_name 
                        ? `${profile.first_name} ${profile.last_name}`
                        : "Perfil sin configurar"
                      }
                    </h4>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Propietario
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>{profile.email}</span>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botón de configuración */}
          <div className="px-6 pb-6">
            <Link href="/settings">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar Información
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}