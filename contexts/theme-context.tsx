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
  const [theme, setThemeState] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // Function to get system theme
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  // Function to apply theme to document
  const applyTheme = useCallback((themeToApply: Theme) => {
    if (typeof window === 'undefined') { return }

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    let finalTheme: 'light' | 'dark'
    if (themeToApply === 'system') {
      finalTheme = getSystemTheme()
    } else {
      finalTheme = themeToApply
    }

    root.classList.add(finalTheme)
    setActualTheme(finalTheme)
  }, [])

  // Function to set theme and save to database
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)

    // Save to localStorage immediately
    localStorage.setItem('theme', newTheme)

    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const existingSettings = user.user_metadata?.system_settings || {}
        await supabase.auth.updateUser({
          data: {
            system_settings: {
              ...existingSettings,
              theme: newTheme
            }
          }
        })
      }
    } catch (error) {
      console.error('Error saving theme to database:', error)
    }
  }

  // Load theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // First try to get from localStorage for immediate application
        const savedTheme = localStorage.getItem('theme') as Theme
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeState(savedTheme)
          applyTheme(savedTheme)
        }

        // Then load from database for authenticated users
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.system_settings?.theme) {
          const dbTheme = user.user_metadata.system_settings.theme as Theme
          setThemeState(dbTheme)
          applyTheme(dbTheme)
          localStorage.setItem('theme', dbTheme)
        }
      } catch (error) {
        console.error('Error loading theme:', error)
      }
    }

    loadTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, applyTheme])

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