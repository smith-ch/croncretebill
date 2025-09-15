"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Language = 'es' | 'en' | 'fr' | 'pt' | 'it'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

// Simple translations object
const translations: Record<Language, Record<string, string>> = {
  es: {
    'dashboard': 'Panel de Control',
    'invoices': 'Facturas',
    'clients': 'Clientes',
    'products': 'Productos',
    'settings': 'Configuración',
    'profile': 'Perfil',
    'company': 'Empresa',
    'system': 'Sistema',
    'security': 'Seguridad',
    'save': 'Guardar',
    'cancel': 'Cancelar',
    'edit': 'Editar',
    'delete': 'Eliminar',
    'search': 'Buscar',
    'loading': 'Cargando...',
    'success': 'Éxito',
    'error': 'Error',
    'welcome': 'Bienvenido',
    'logout': 'Cerrar Sesión'
  },
  en: {
    'dashboard': 'Dashboard',
    'invoices': 'Invoices',
    'clients': 'Clients',
    'products': 'Products',
    'settings': 'Settings',
    'profile': 'Profile',
    'company': 'Company',
    'system': 'System',
    'security': 'Security',
    'save': 'Save',
    'cancel': 'Cancel',
    'edit': 'Edit',
    'delete': 'Delete',
    'search': 'Search',
    'loading': 'Loading...',
    'success': 'Success',
    'error': 'Error',
    'welcome': 'Welcome',
    'logout': 'Logout'
  },
  fr: {
    'dashboard': 'Tableau de Bord',
    'invoices': 'Factures',
    'clients': 'Clients',
    'products': 'Produits',
    'settings': 'Paramètres',
    'profile': 'Profil',
    'company': 'Entreprise',
    'system': 'Système',
    'security': 'Sécurité',
    'save': 'Enregistrer',
    'cancel': 'Annuler',
    'edit': 'Modifier',
    'delete': 'Supprimer',
    'search': 'Rechercher',
    'loading': 'Chargement...',
    'success': 'Succès',
    'error': 'Erreur',
    'welcome': 'Bienvenue',
    'logout': 'Déconnexion'
  },
  pt: {
    'dashboard': 'Painel',
    'invoices': 'Faturas',
    'clients': 'Clientes',
    'products': 'Produtos',
    'settings': 'Configurações',
    'profile': 'Perfil',
    'company': 'Empresa',
    'system': 'Sistema',
    'security': 'Segurança',
    'save': 'Salvar',
    'cancel': 'Cancelar',
    'edit': 'Editar',
    'delete': 'Excluir',
    'search': 'Buscar',
    'loading': 'Carregando...',
    'success': 'Sucesso',
    'error': 'Erro',
    'welcome': 'Bem-vindo',
    'logout': 'Sair'
  },
  it: {
    'dashboard': 'Dashboard',
    'invoices': 'Fatture',
    'clients': 'Clienti',
    'products': 'Prodotti',
    'settings': 'Impostazioni',
    'profile': 'Profilo',
    'company': 'Azienda',
    'system': 'Sistema',
    'security': 'Sicurezza',
    'save': 'Salva',
    'cancel': 'Annulla',
    'edit': 'Modifica',
    'delete': 'Elimina',
    'search': 'Cerca',
    'loading': 'Caricamento...',
    'success': 'Successo',
    'error': 'Errore',
    'welcome': 'Benvenuto',
    'logout': 'Logout'
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es')

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || key
  }

  // Function to set language and save to database
  const setLanguage = async (newLanguage: Language) => {
    setLanguageState(newLanguage)

    // Save to localStorage immediately
    localStorage.setItem('language', newLanguage)

    // Set document language
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLanguage
    }

    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const existingSettings = user.user_metadata?.system_settings || {}
        await supabase.auth.updateUser({
          data: {
            system_settings: {
              ...existingSettings,
              language: newLanguage
            }
          }
        })
      }
    } catch (error) {
      console.error('Error saving language to database:', error)
    }
  }

  // Load language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // First try to get from localStorage for immediate application
        const savedLanguage = localStorage.getItem('language') as Language
        if (savedLanguage && ['es', 'en', 'fr', 'pt', 'it'].includes(savedLanguage)) {
          setLanguageState(savedLanguage)
          if (typeof document !== 'undefined') {
            document.documentElement.lang = savedLanguage
          }
        }

        // Then load from database for authenticated users
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.system_settings?.language) {
          const dbLanguage = user.user_metadata.system_settings.language as Language
          setLanguageState(dbLanguage)
          localStorage.setItem('language', dbLanguage)
          if (typeof document !== 'undefined') {
            document.documentElement.lang = dbLanguage
          }
        }
      } catch (error) {
        console.error('Error loading language:', error)
      }
    }

    loadLanguage()
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}