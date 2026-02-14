"use client"

import React, { useState } from "react"
import { SettingsTabs } from "@/components/settings/settings-tabs"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { CompanySettings } from "@/components/settings/company-settings"
import { SystemSettings } from "@/components/settings/system-settings"
import { SecuritySettingsComponent } from "@/components/settings/security-settings"
import { RoleSecuritySettings } from "@/components/settings/role-security-settings"
import { User, Building2, Settings, Shield } from "lucide-react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")

  const tabs = [
    {
      id: "profile",
      label: "Perfil",
      icon: User,
      description: "Información personal y preferencias"
    },
    {
      id: "company",
      label: "Empresa",
      icon: Building2,
      description: "Configuración de la empresa"
    },
    {
      id: "system",
      label: "Sistema", 
      icon: Settings,
      description: "Preferencias de la aplicación"
    },
    {
      id: "security",
      label: "Seguridad",
      icon: Shield,
      description: "Configuración de seguridad y acceso"
    }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />
      case "company":
        return <CompanySettings />
      case "system":
        return <SystemSettings />
      case "security":
        return <SecuritySettingsComponent />
      default:
        return <ProfileSettings />
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <SettingsTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {renderContent()}
      </SettingsTabs>
    </div>
  )
}
