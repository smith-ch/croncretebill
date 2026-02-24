"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  Building2,
  Mail,
  Lock,
  User,
  UserPlus,
  LogIn,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CreditCard
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
  max_users: number
  max_invoices: number
  max_products: number
  max_clients: number
}

export function ModernAuthForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("signin")
  const [mounted, setMounted] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")

  useEffect(() => {
    setMounted(true)
    loadAvailablePlans()
  }, [])

  const loadAvailablePlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        const plans = data as SubscriptionPlan[]
        setAvailablePlans(plans)
        // Seleccionar el plan Professional por defecto
        const professionalPlan = plans.find(p => p.name === 'professional')
        if (professionalPlan) {
          setSelectedPlanId(professionalPlan.id)
        } else {
          setSelectedPlanId(plans[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        staggerChildren: 0.15
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(5px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
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

    if (!selectedPlanId) {
      setMessage({
        type: "error",
        text: "Por favor selecciona un plan de suscripción",
      })
      setLoading(false)
      return
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            company_name: companyName,
            selected_plan_id: selectedPlanId,
          },
        },
      })

      if (error) {
        console.error('Signup error details:', error)
        throw error
      }

      // Crear suscripción automática si es plan gratuito
      if (authData?.user) {
        const selectedPlan = availablePlans.find(p => p.id === selectedPlanId)

        // Si es plan gratuito (free), crear suscripción activa inmediatamente
        if (selectedPlan?.name === 'free') {
          console.log('📦 Asignando plan gratuito automáticamente...')

          const { error: subError } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: authData.user.id,
              plan_id: selectedPlanId,
              status: 'active',
              start_date: new Date().toISOString(),
              end_date: null, // Sin límite para plan gratuito
              current_max_users: selectedPlan.max_users,
              current_max_invoices: selectedPlan.max_invoices,
              current_max_products: selectedPlan.max_products,
              current_max_clients: selectedPlan.max_clients
            } as any)

          if (subError) {
            console.error('Error creando suscripción gratuita:', subError)
          } else {
            console.log('✅ Plan gratuito asignado exitosamente')
          }
        } else {
          // Para planes de pago, crear solicitud de suscripción
          const { error: requestError } = await supabase
            .from('subscription_requests')
            .insert({
              user_id: authData.user.id,
              new_plan_id: selectedPlanId,
              message: `Nuevo registro - Solicita plan ${selectedPlan?.display_name || 'desconocido'}`,
              status: 'pending'
            } as any)

          if (requestError) {
            console.error('Error creating subscription request:', requestError)
          }
        }
      }

      const selectedPlan = availablePlans.find(p => p.id === selectedPlanId)
      const isFree = selectedPlan?.name === 'free'

      setMessage({
        type: "success",
        text: isFree
          ? "¡Cuenta creada exitosamente! Ya puedes iniciar sesión con tu plan gratuito."
          : "¡Cuenta creada exitosamente! Por favor, revisa tu correo electrónico para verificar tu cuenta. El administrador revisará tu solicitud de suscripción.",
      })
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Error al crear la cuenta",
      })
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
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Verificar estado de suscripción
      if (authData?.user) {
        console.log('🔍 Login - Verificando permisos para:', authData.user.id, authData.user.email)

        // Verificar perfil del usuario (sin is_super_admin que no existe)
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('parent_user_id, is_active, display_name, role_id, user_roles(name)')
          .eq('user_id', authData.user.id)
          .single()

        console.log('📋 Perfil obtenido:', profileData)
        console.log('⚠️ Error al obtener perfil:', profileError)

        // 1. Verificar si es Subscription Manager (gestor de suscripciones)
        const isSubscriptionManager = profileData?.user_roles?.name === 'subscription_manager'
        console.log('🎫 Rol:', profileData?.user_roles?.name, '| Es gestor?', isSubscriptionManager)

        if (isSubscriptionManager) {
          console.log('✅ GESTOR DE SUSCRIPCIONES - acceso garantizado sin verificar suscripción')
          // NO hacer return aquí, solo no verificar la suscripción más adelante
        }

        // 2. Verificar si es empleado
        const isEmployee = profileData?.parent_user_id !== null && profileData?.parent_user_id !== undefined
        console.log('👤 Es empleado:', isEmployee, '| parent_user_id:', profileData?.parent_user_id)

        if (isEmployee) {
          console.log('✅ Empleado - acceso permitido por herencia del owner')
          // No verificar suscripción para empleados
        } else if (!isSubscriptionManager) {
          // 3. Es owner normal (no es gestor ni empleado) - verificar su suscripción
          console.log('👔 Es owner normal - verificando suscripción...')
          const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('status, end_date, subscription_plans!plan_id(display_name)')
            .eq('user_id', authData.user.id)
            .maybeSingle()

          console.log('📊 Suscripción:', subscription)
          console.log('⚠️ Error suscripción:', subError)

          // Verificar si la suscripción está expirada
          const isExpired = subscription?.end_date && new Date(subscription.end_date) < new Date()
          const isActive = subscription?.status === 'active' && !isExpired

          console.log('🔍 Estado: expired?', isExpired, '| active?', isActive, '| status:', subscription?.status)

          if (!isActive && subscription?.status !== 'trial') {
            console.log('❌ Suscripción no válida - bloqueando acceso')

            // Cerrar sesión
            await supabase.auth.signOut()

            setMessage({
              type: "error",
              text: isExpired
                ? `Tu suscripción expiró el ${new Date(subscription.end_date).toLocaleDateString()}. Contacta al administrador para renovarla.`
                : "No tienes una suscripción activa. Contacta al administrador.",
            })
            setLoading(false)
            return
          }

          console.log('✅ Owner con suscripción válida - acceso permitido')
        } else {
          console.log('✅ Acceso garantizado - No se verifica suscripción (gestor o empleado)')
        }
      }
    } catch (error: any) {
      const errMsg = error?.message || "Error al iniciar sesión"
      // Errores 500/Database suelen ser triggers o configuración en Supabase
      const isServerError = errMsg.toLowerCase().includes("database") ||
        errMsg.includes("500") ||
        error?.status === 500 ||
        errMsg.toLowerCase().includes("internal server error")
      setMessage({
        type: "error",
        text: isServerError
          ? "Error del servidor al verificar credenciales. Por favor contacta al administrador del sistema."
          : errMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage(null)
    try {
      // Nota: La verificación de suscripción para OAuth se maneja en el callback
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      if (error) {
        throw error
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Error al iniciar sesión con Google",
      })
      setLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'email',
        }
      })
      if (error) {
        throw error
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Error al iniciar sesión con Facebook",
      })
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!resetEmail || !resetEmail.includes('@')) {
      setMessage({
        type: "error",
        text: "Por favor ingresa un correo electrónico válido",
      })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        console.error('Reset password error:', error)
        throw error
      }

      console.log('Reset password success:', data)

      setMessage({
        type: "success",
        text: "¡Correo enviado! Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.",
      })
      setResetEmail("")
      setTimeout(() => {
        setShowResetPassword(false)
        setMessage(null)
      }, 5000)
    } catch (error: any) {
      console.error('Reset password catch error:', error)
      setMessage({
        type: "error",
        text: error.message || "Error al enviar el correo. Verifica que el email sea correcto.",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-500 border-t-slate-300"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Animated gradient orbs with more complex movement */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-80 h-80 bg-blue-600/30 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px]"
        />
      </div>
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0"
          style={{
            backgroundImage: `
                 linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px)
               `,
            backgroundSize: '50px 50px'
          }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />

      {/* Main Content - Two Column Layout */}
      <div className="w-full max-w-7xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* Left Column - Login Form */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          <Card className="backdrop-blur-2xl bg-slate-900/70 border border-slate-700/40 shadow-2xl shadow-blue-950/20 ring-1 ring-white/5">
            <CardHeader className="text-center pb-4 pt-8">
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center mb-5"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl" />
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/20 border border-blue-500/30 backdrop-blur-sm">
                    <Building2 className="h-8 w-8 text-blue-300" />
                  </div>
                </div>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-slate-300 bg-clip-text text-transparent mb-1"
              >
                ConcreteBill
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-slate-400 text-sm mb-6 tracking-wide"
              >
                Sistema de facturación empresarial
              </motion.p>
            </CardHeader>

            <CardContent className="p-6">
              <motion.div variants={itemVariants}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-800/60 border border-slate-600/40 p-1.5 rounded-xl backdrop-blur-sm">
                    <TabsTrigger
                      value="signin"
                      className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-200 data-[state=active]:border-blue-500/30 data-[state=active]:border data-[state=active]:shadow-sm text-slate-400 transition-all duration-300 rounded-lg flex items-center gap-2 justify-center py-2.5"
                    >
                      <LogIn className="h-4 w-4" />
                      Iniciar Sesión
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-200 data-[state=active]:border-blue-500/30 data-[state=active]:border data-[state=active]:shadow-sm text-slate-400 transition-all duration-300 rounded-lg flex items-center gap-2 justify-center py-2.5"
                    >
                      <UserPlus className="h-4 w-4" />
                      Registrarse
                    </TabsTrigger>
                  </TabsList>

                  <AnimatePresence mode="wait">
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="mb-4"
                      >
                        <motion.div
                          className={`p-4 rounded-lg border ${message.type === "error"
                            ? "border-red-900/50 bg-red-950/30"
                            : "border-emerald-900/50 bg-emerald-950/30"
                            }`}
                          animate={{
                            scale: [1, 1.02, 1],
                          }}
                          transition={{
                            duration: 0.5,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {message.type === "error" ? (
                              <motion.div
                                animate={{ rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 0.5 }}
                              >
                                <AlertCircle className="h-5 w-5 text-red-400" />
                              </motion.div>
                            ) : (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.5 }}
                              >
                                <CheckCircle className="h-5 w-5 text-green-400" />
                              </motion.div>
                            )}
                            <span className={`text-sm font-medium ${message.type === "error" ? "text-red-200" : "text-green-200"
                              }`}>
                              {message.text}
                            </span>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <TabsContent value="signin" className="space-y-6 mt-0">
                    <motion.form
                      onSubmit={handleSignIn}
                      className="space-y-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Correo Electrónico
                        </Label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="pl-12 h-12 bg-slate-800/60 border border-slate-600/40 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl group-hover:bg-slate-800/80"
                            placeholder="tu@email.com"
                          />
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Contraseña
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            className="pl-12 pr-12 h-12 bg-slate-800/60 border border-slate-600/40 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl group-hover:bg-slate-800/80"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors z-10"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="mt-6">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold transition-all duration-300 rounded-xl border-0 flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Iniciando sesión...</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="h-5 w-5" />
                              <span>Iniciar Sesión</span>
                            </>
                          )}
                        </Button>
                      </motion.div>

                      {/* Forgot Password Link */}
                      <motion.div
                        className="text-center space-y-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(true)}
                          className="text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline transition-colors flex items-center gap-2 justify-center mx-auto"
                        >
                          <KeyRound className="h-4 w-4" />
                          ¿Olvidaste tu contraseña?
                        </button>

                      </motion.div>

                      {/* Social Login Divider */}
                      <motion.div
                        className="relative my-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-700/60"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-slate-900/70 text-slate-500 text-xs uppercase tracking-wider font-medium">O continuar con</span>
                        </div>
                      </motion.div>

                      {/* Social Login Buttons */}
                      <motion.div
                        className="grid grid-cols-2 gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        {/* Google Button */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full h-12 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 text-white transition-all duration-300 rounded-xl hover:border-slate-500/50"
                          >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                              <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z" />
                              <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z" />
                              <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z" />
                              <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z" />
                            </svg>
                            Google
                          </Button>
                        </motion.div>

                        {/* Facebook Button */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            type="button"
                            onClick={handleFacebookSignIn}
                            disabled={loading}
                            className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] border border-[#1877F2]/50 text-white transition-all duration-300 rounded-xl shadow-lg shadow-[#1877F2]/10"
                          >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Facebook
                          </Button>
                        </motion.div>
                      </motion.div>
                    </motion.form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-6 mt-0">
                    <motion.form
                      onSubmit={handleSignUp}
                      className="space-y-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Signup form fields */}
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nombre Completo
                        </Label>
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 z-10" />
                          <Input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            className="pl-12 h-12 bg-slate-800/60 border border-slate-600/40 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                            placeholder="Juan Pérez"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Nombre de la Empresa
                        </Label>
                        <div className="relative group">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 z-10" />
                          <Input
                            id="companyName"
                            name="companyName"
                            type="text"
                            required
                            className="pl-12 h-12 bg-slate-800/60 border border-slate-600/40 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                            placeholder="Mi Empresa S.A."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-signup" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Correo Electrónico
                        </Label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 z-10" />
                          <Input
                            id="email-signup"
                            name="email"
                            type="email"
                            required
                            className="pl-12 h-12 bg-slate-800/60 border border-slate-600/40 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                            placeholder="tu@empresa.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password-signup" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Contraseña
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 z-10" />
                          <Input
                            id="password-signup"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            className="pl-12 pr-12 h-12 bg-slate-800/60 border border-slate-600/40 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors z-10"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="plan-select" className="text-sm font-medium text-white/90 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Plan de Suscripción
                        </Label>
                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId} required>
                          <SelectTrigger className="h-12 bg-slate-800/60 border border-slate-600/40 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all duration-300">
                            <SelectValue placeholder="Selecciona un plan" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {availablePlans.map(plan => (
                              <SelectItem
                                key={plan.id}
                                value={plan.id}
                                className="text-white hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-semibold">{plan.display_name}</span>
                                  <span className="text-sm ml-4">${plan.price_monthly}/mes</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedPlanId && (
                          <p className="text-xs text-slate-500">
                            {availablePlans.find(p => p.id === selectedPlanId)?.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-6">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold transition-all duration-300 rounded-xl border-0 flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 hover:translate-y-[-1px] active:translate-y-0"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Creando cuenta...</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-5 w-5" />
                              <span>Crear cuenta</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Social Login Divider */}
                      <motion.div
                        className="relative my-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-700/60"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-slate-900/70 text-slate-500 text-xs uppercase tracking-wider font-medium">O regístrate con</span>
                        </div>
                      </motion.div>

                      {/* Social Login Buttons */}
                      <motion.div
                        className="grid grid-cols-2 gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        {/* Google Button */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full h-12 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 text-white transition-all duration-300 rounded-xl hover:border-slate-500/50"
                          >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                              <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z" />
                              <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z" />
                              <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z" />
                              <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z" />
                            </svg>
                            Google
                          </Button>
                        </motion.div>

                        {/* Facebook Button */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            type="button"
                            onClick={handleFacebookSignIn}
                            disabled={loading}
                            className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] border border-[#1877F2]/50 text-white transition-all duration-300 rounded-xl shadow-lg shadow-[#1877F2]/10"
                          >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Facebook
                          </Button>
                        </motion.div>
                      </motion.div>
                    </motion.form>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </CardContent>
          </Card>

          <motion.div
            variants={itemVariants}
            className="text-center mt-6"
          >
            <p className="text-xs text-slate-600 tracking-wide">
              ConcreteBill™ · Facturación inteligente
            </p>
          </motion.div>
        </motion.div>

        {/* Reset Password Modal */}
        <AnimatePresence>
          {showResetPassword && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowResetPassword(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md"
                >
                  <Card className="backdrop-blur-xl bg-slate-900/95 border border-slate-700/50 shadow-2xl">
                    <CardHeader className="text-center pb-4">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-14 h-14 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center">
                          <KeyRound className="h-7 w-7 text-slate-300" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Restablecer contraseña
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña
                      </p>
                    </CardHeader>
                    <CardContent className="p-6">
                      {message && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-4"
                        >
                          <div
                            className={`p-4 rounded-xl border backdrop-blur-sm ${message.type === "error"
                              ? "border-red-300/30 bg-red-500/10"
                              : "border-green-300/30 bg-green-500/10"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              {message.type === "error" ? (
                                <AlertCircle className="h-5 w-5 text-red-400" />
                              ) : (
                                <CheckCircle className="h-5 w-5 text-green-400" />
                              )}
                              <span className={`text-sm font-medium ${message.type === "error" ? "text-red-200" : "text-green-200"
                                }`}>
                                {message.text}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Correo Electrónico
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 z-10" />
                            <Input
                              id="reset-email"
                              type="email"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              required
                              className="pl-12 h-12 bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors rounded-lg"
                              placeholder="tu@email.com"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            type="button"
                            onClick={() => {
                              setShowResetPassword(false)
                              setMessage(null)
                              setResetEmail("")
                            }}
                            className="flex-1 h-11 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white transition-colors rounded-lg"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-11 bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors border border-slate-600 rounded-lg"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Enviando...
                              </>
                            ) : (
                              "Enviar"
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Right Column - Pricing Info */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:block"
        >
          <Card className="backdrop-blur-2xl bg-slate-900/70 border border-slate-700/40 shadow-2xl shadow-purple-950/10 ring-1 ring-white/5 h-full flex flex-col">
            <CardHeader className="text-center pb-2 pt-6">
              <div className="relative mx-auto mb-3">
                <div className="absolute inset-0 bg-purple-500/20 rounded-xl blur-lg" />
                <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/20 border border-purple-500/30">
                  <CreditCard className="h-6 w-6 text-purple-300" />
                </div>
              </div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-1">
                Planes de suscripción
              </h2>
              <p className="text-slate-400 text-sm">
                Elige el plan que mejor se adapte a tu empresa
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5 flex-1 overflow-y-auto">
              {/* Mensaje Principal */}
              <div className="bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-slate-300 text-xs leading-relaxed">
                  ✨ <strong>Regístrate ahora</strong> y obtén acceso <strong className="text-emerald-400">gratuito</strong> durante el periodo de prueba.
                </p>
              </div>

              {/* Planes de Suscripción */}
              <div className="space-y-2">
                <h3 className="text-slate-300 font-medium text-sm mb-2">
                  Planes disponibles
                </h3>

                {/* Plan Starter */}
                <div className="bg-slate-800/30 border border-slate-600/40 rounded-xl p-3 hover:border-blue-500/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-medium text-sm group-hover:text-blue-200 transition-colors">Plan Starter</h4>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-xl font-bold text-white">$19.99</span>
                    <span className="text-slate-500 text-[10px]">/mes</span>
                  </div>
                  <ul className="space-y-0.5 text-slate-400 text-[10px]">
                    <li>✓ Hasta 500 facturas/mes</li>
                    <li>✓ Hasta 3 usuarios</li>
                    <li>✓ 300 productos/servicios</li>
                    <li>✓ 100 clientes</li>
                  </ul>
                </div>

                {/* Plan Professional */}
                <div className="relative bg-gradient-to-br from-blue-600/10 to-cyan-600/5 border-2 border-blue-500/40 rounded-xl p-3 shadow-lg shadow-blue-600/5">
                  <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-sm">Popular</div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-blue-200 font-semibold text-sm">Plan Professional</h4>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-xl font-bold text-white">$39.99</span>
                    <span className="text-slate-400 text-[10px]">/mes</span>
                  </div>
                  <ul className="space-y-0.5 text-slate-300 text-[10px]">
                    <li>✓ Hasta 1,000 facturas/mes</li>
                    <li>✓ Hasta 10 usuarios</li>
                    <li>✓ 1,000 productos/servicios</li>
                    <li>✓ 500 clientes</li>
                  </ul>
                </div>

                {/* Plan Business */}
                <div className="bg-slate-800/30 border border-slate-600/40 rounded-xl p-3 hover:border-purple-500/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-medium text-sm group-hover:text-purple-200 transition-colors">Plan Business</h4>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-xl font-bold text-white">$59.99</span>
                    <span className="text-slate-500 text-[10px]">/mes</span>
                  </div>
                  <ul className="space-y-0.5 text-slate-400 text-[10px]">
                    <li>✓ Hasta 5,000 facturas/mes</li>
                    <li>✓ Hasta 20 usuarios</li>
                    <li>✓ 5,000 productos/servicios</li>
                    <li>✓ API + soporte 24/7</li>
                  </ul>
                </div>

                {/* Plan Enterprise */}
                <div className="bg-slate-800/30 border border-slate-600/40 rounded-xl p-3 hover:border-amber-500/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-medium text-sm group-hover:text-amber-200 transition-colors">Plan Enterprise</h4>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-xl font-bold text-white">$89.99</span>
                    <span className="text-slate-500 text-[10px]">/mes</span>
                  </div>
                  <ul className="space-y-0.5 text-slate-400 text-[10px]">
                    <li>✓ Hasta 10,000 facturas/mes</li>
                    <li>✓ Hasta 50 usuarios</li>
                    <li>✓ 20,000 productos/servicios</li>
                    <li>✓ Multi-sucursales</li>
                  </ul>
                </div>
              </div>

              {/* Beneficios */}
              <div className="bg-gradient-to-br from-emerald-600/5 to-teal-600/5 border border-emerald-500/20 rounded-xl p-3">
                <h4 className="text-emerald-300 font-semibold text-xs mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Incluido en todos los planes
                </h4>
                <ul className="space-y-0.5 text-slate-400 text-[10px]">
                  <li>✓ Facturación electrónica NCF</li>
                  <li>✓ Gestión de inventario</li>
                  <li>✓ Reportes DGII (606/607)</li>
                  <li>✓ Respaldos automáticos</li>
                  <li>✓ App móvil incluida</li>
                  <li>✓ Cotizaciones y presupuestos</li>
                </ul>
              </div>

              {/* Call to Action */}
              <div className="text-center pt-1">
                <p className="text-slate-500 text-[10px]">
                  Precios sujetos a disponibilidad
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div >
  )
}