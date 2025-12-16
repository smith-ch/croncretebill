"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // FORZAR MODO CLARO TEMPORALMENTE - Dark mode deshabilitado
  const [theme, setThemeState] = useState<Theme>('light')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // Function to get system theme (DESHABILITADO)
  const getSystemTheme = (): 'light' | 'dark' => {
    return 'light' // FORZAR LIGHT MODE
  }

  // Function to apply theme to document (DESHABILITADO)
  const applyTheme = useCallback((themeToApply: Theme) => {
    if (typeof window === 'undefined') { return }

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    
    // FORZAR SIEMPRE LIGHT MODE
    root.classList.add('light')
    setActualTheme('light')
  }, [])

  // Function to set theme and save to database (DESHABILITADO - FORZAR LIGHT)
  const setTheme = async (newTheme: Theme) => {
    // FORZAR SIEMPRE LIGHT MODE - Ignorar el tema seleccionado
    setThemeState('light')
    applyTheme('light')
    localStorage.setItem('theme', 'light')
    
    // No guardar en DB por ahora
  }

  // Load theme on mount (FORZAR LIGHT)
  useEffect(() => {
    // FORZAR SIEMPRE LIGHT MODE
    setThemeState('light')
    applyTheme('light')
    localStorage.setItem('theme', 'light')
    
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      root.classList.remove('dark')
      root.classList.add('light')
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}