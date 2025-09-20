"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Building2 } from "lucide-react"

export function AuthForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState("signin")
  const [messageTimeoutId, setMessageTimeoutId] = useState<number | null>(null)

  // Función para manejar el cambio de pestaña y limpiar mensajes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setMessage(null) // Limpiar mensajes al cambiar de pestaña
    
    // Limpiar timeout si existe
    if (messageTimeoutId) {
      clearTimeout(messageTimeoutId)
      setMessageTimeoutId(null)
    }
  }

  // Función para mostrar mensaje con auto-ocultado
  const showMessage = (type: "success" | "error", text: string, autoHide = false) => {
    // Limpiar timeout anterior si existe
    if (messageTimeoutId) {
      clearTimeout(messageTimeoutId)
    }

    setMessage({ type, text })

    // Auto-ocultar si es necesario
    if (autoHide) {
      const timeoutId = setTimeout(() => {
        setMessage(null)
        setMessageTimeoutId(null)
      }, 7000) // 7 segundos para dar tiempo a leer
      setMessageTimeoutId(timeoutId)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string
    const companyName = formData.get("companyName") as string

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      })

      if (error) {
        throw error
      }

      // Si el usuario se crea inmediatamente (sin confirmación por email)
      if (data.user && data.user.email_confirmed_at) {
        // Verificar que el perfil se haya creado
        await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar un momento
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single()

        // Si no se creó el perfil automáticamente, crearlo manualmente
        if (!profile || profileError) {
          await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: fullName,
              company_name: companyName,
              role: "vendedor"
            })
        }
      }

      showMessage(
        "success",
        "¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta.",
        true // Auto-ocultar después de 7 segundos
      )

      // Limpiar el formulario después del registro exitoso
      e.currentTarget.reset()

    } catch (error: any) {
      let errorMessage = error.message || "Error al crear la cuenta"
      
      // Mejorar mensajes de error específicos
      if (error.message?.includes("User already registered")) {
        errorMessage = "Ya existe una cuenta con este email"
      } else if (error.message?.includes("Password should be")) {
        errorMessage = "La contraseña debe tener al menos 6 caracteres"
      }
      
      showMessage("error", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Verificar si el usuario tiene un perfil después del login
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single()

        // Si no tiene perfil, intentar crearlo
        if (!profile || profileError) {
          const { error: createProfileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || "",
              company_name: data.user.user_metadata?.company_name || "",
              role: "vendedor"
            })
            .select()
            .single()

          if (createProfileError) {
            console.warn("No se pudo crear el perfil automáticamente:", createProfileError)
            showMessage(
              "error",
              "Problema con su cuenta. Por favor contacte al administrador o vuelva a registrarse."
            )
            return
          } else {
            showMessage(
              "success", 
              "Perfil creado automáticamente. Bienvenido!",
              true
            )
          }
        }
      }

    } catch (error: any) {
      let errorMessage = error.message || "Error al iniciar sesión"
      
      // Mejorar mensajes de error específicos
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email o contraseña incorrectos"
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Por favor confirma tu email antes de iniciar sesión"
      }
      
      showMessage("error", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Fondo animado con gradientes más intensos */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600/30 via-blue-600/30 to-purple-600/30 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-purple-700/20 via-pink-600/20 to-rose-600/20"></div>
      </div>
      
      {/* Partículas flotantes más brillantes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-300/60 rounded-full animate-bounce shadow-lg shadow-cyan-400/50"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
      
      {/* Ondas animadas con más contraste */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-spin shadow-2xl"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/25 to-pink-500/25 rounded-full blur-3xl animate-pulse shadow-2xl"></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 rounded-full blur-3xl animate-bounce shadow-2xl"></div>
      </div>

      {/* Contenedores del lado derecho - Facturación y Contabilidad */}
      <div className="hidden lg:block absolute right-8 top-1/2 transform -translate-y-1/2 z-10 space-y-6">
        {/* Sistema de Facturación */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-500 max-w-xs">
          <div className="w-48 h-32 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-xl mb-4 flex items-center justify-center border border-white/30">
            {/* Icono SVG de facturas */}
            <svg className="w-20 h-20 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
              <path d="M14 2v6h6"/>
              <path d="M16 13H8"/>
              <path d="M16 17H8"/>
              <path d="M10 9H8"/>
            </svg>
          </div>
          <h3 className="text-white/90 font-semibold text-sm mb-2">Sistema de Facturación</h3>
          <p className="text-cyan-200/70 text-xs">Gestiona facturas, presupuestos e ITBIS de forma profesional</p>
        </div>

        {/* Control Contable */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-500 max-w-xs">
          <div className="w-48 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-xl mb-4 flex items-center justify-center border border-white/30">
            {/* Icono SVG de contabilidad */}
            <svg className="w-20 h-20 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 11H7a1 1 0 0 0 0 2h2a1 1 0 0 0 0-2z"/>
              <path d="M13 11h-2a1 1 0 0 0 0 2h2a1 1 0 0 0 0-2z"/>
              <path d="M17 11h-2a1 1 0 0 0 0 2h2a1 1 0 0 0 0-2z"/>
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14v11zM5 6V5h14v1H5z"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
          </div>
          <h3 className="text-white/90 font-semibold text-sm mb-2">Control Contable</h3>
          <p className="text-cyan-200/70 text-xs">Reportes financieros, gastos y análisis empresarial</p>
        </div>
      </div>

      {/* Versiones responsivas para pantallas medianas - Parte superior */}
      <div className="hidden md:flex lg:hidden absolute top-8 left-1/2 transform -translate-x-1/2 z-10 space-x-8">
        <div className="bg-white/8 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20 flex items-center space-x-3 hover:bg-white/12 transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-lg flex items-center justify-center border border-white/30">
            <svg className="w-6 h-6 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
              <path d="M14 2v6h6"/>
              <path d="M16 13H8"/>
            </svg>
          </div>
          <div>
            <h4 className="text-white/90 font-medium text-xs">Facturación</h4>
            <p className="text-cyan-200/60 text-xs">Facturas e ITBIS</p>
          </div>
        </div>
        
        <div className="bg-white/8 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20 flex items-center space-x-3 hover:bg-white/12 transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-lg flex items-center justify-center border border-white/30">
            <svg className="w-6 h-6 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14v11z"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
          </div>
          <div>
            <h4 className="text-white/90 font-medium text-xs">Contabilidad</h4>
            <p className="text-cyan-200/60 text-xs">Reportes y gastos</p>
          </div>
        </div>
      </div>
      
      {/* Contenido principal con mayor contraste */}
      <div className="relative z-10 w-full max-w-md">
        <Card className="backdrop-blur-2xl bg-white/15 border-white/30 shadow-2xl ring-1 ring-white/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-2xl animate-pulse ring-4 ring-white/30">
                <Building2 className="h-10 w-10 text-white drop-shadow-2xl" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-white drop-shadow-2xl bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">
              ConcreteFlow
            </CardTitle>
            <CardDescription className="text-cyan-100/90 text-lg font-medium drop-shadow-lg">
              Sistema de facturación y conduces para empresas de concreto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                <TabsTrigger 
                  value="signin" 
                  className="text-white/90 font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="text-white/90 font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-cyan-100 font-semibold text-sm">Email</Label>
                    <Input 
                      id="signin-email" 
                      name="email" 
                      type="email" 
                      placeholder="tu@empresa.com" 
                      required 
                      className="bg-white/15 border-white/40 text-white placeholder:text-cyan-200/70 backdrop-blur-sm focus:bg-white/25 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300 shadow-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-cyan-100 font-semibold text-sm">Contraseña</Label>
                    <Input 
                      id="signin-password" 
                      name="password" 
                      type="password" 
                      required 
                      className="bg-white/15 border-white/40 text-white placeholder:text-cyan-200/70 backdrop-blur-sm focus:bg-white/25 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300 shadow-lg"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ring-2 ring-white/20 hover:ring-white/40"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-cyan-100 font-semibold text-sm">Nombre Completo</Label>
                    <Input 
                      id="signup-name" 
                      name="fullName" 
                      type="text" 
                      placeholder="Juan Pérez" 
                      required 
                      className="bg-white/15 border-white/40 text-white placeholder:text-cyan-200/70 backdrop-blur-sm focus:bg-white/25 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300 shadow-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-company" className="text-cyan-100 font-semibold text-sm">Empresa</Label>
                    <Input
                      id="signup-company"
                      name="companyName"
                      type="text"
                      placeholder="Concretos del Caribe"
                      required
                      className="bg-white/15 border-white/40 text-white placeholder:text-cyan-200/70 backdrop-blur-sm focus:bg-white/25 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300 shadow-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-cyan-100 font-semibold text-sm">Email</Label>
                    <Input 
                      id="signup-email" 
                      name="email" 
                      type="email" 
                      placeholder="tu@empresa.com" 
                      required 
                      className="bg-white/15 border-white/40 text-white placeholder:text-cyan-200/70 backdrop-blur-sm focus:bg-white/25 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300 shadow-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-cyan-100 font-semibold text-sm">Contraseña</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      className="bg-white/15 border-white/40 text-white placeholder:text-cyan-200/70 backdrop-blur-sm focus:bg-white/25 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300 shadow-lg"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ring-2 ring-white/20 hover:ring-white/40"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {message && (
              <Alert
                className={`mt-4 backdrop-blur-sm shadow-lg border-2 ${
                  message.type === "error" 
                    ? "border-red-400/70 bg-red-500/30 shadow-red-500/25" 
                    : "border-emerald-400/70 bg-emerald-500/30 shadow-emerald-500/25"
                }`}
              >
                <AlertDescription className={`font-semibold drop-shadow-sm ${
                  message.type === "error" ? "text-red-100" : "text-emerald-100"
                }`}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
