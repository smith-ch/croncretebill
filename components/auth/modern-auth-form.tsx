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
  Sparkles,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound
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
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
      }
    }
  }

  const logoVariants = {
    animate: {
      y: [0, -5, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
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
        // 1. Verificar si el usuario es subscription_manager (siempre tiene acceso)
        const { data: isManager, error: managerError } = await supabase
          .rpc('is_subscription_manager', { p_user_id: authData.user.id } as any)
        
        console.log('🔍 Login - Checking subscription_manager:', { userId: authData.user.id, isManager, managerError })
        
        if (managerError) {
          console.error('Error verificando rol de manager:', managerError)
        }
        
        if (isManager) {
          console.log('✅ Usuario es subscription_manager - acceso permitido sin verificar suscripción')
          // Manager tiene acceso total, no verificar suscripción
        } else {
          // 2. Verificar si el usuario es empleado (no necesita suscripción propia)
          const { data: isEmployee, error: employeeError } = await supabase
            .rpc('is_employee', { p_user_id: authData.user.id } as any)
          
          console.log('🔍 Login - Checking employee status:', { userId: authData.user.id, isEmployee, employeeError })
          
          if (employeeError) {
            console.error('Error verificando estado de empleado:', employeeError)
          }
          
          if (isEmployee) {
            console.log('✅ Usuario es empleado - acceso permitido sin verificar suscripción propia')
            // Empleados no necesitan suscripción propia, operan bajo la del owner
          } else {
            // 3. Solo verificar suscripción si NO es manager NI empleado
            console.log('🔍 Usuario es owner - verificando suscripción...')
            const { data: subscription, error: subError } = await supabase
              .from('user_subscriptions')
              .select('status, end_date, plan:subscription_plans(display_name)')
              .eq('user_id', authData.user.id)
              .maybeSingle()

            console.log('🔍 Subscription query result:', { subscription, subError })

            const sub = subscription as any
            // Si no tiene suscripción o está inactiva
            if (!sub || sub.status !== 'active') {
              // Cerrar sesión inmediatamente
              await supabase.auth.signOut()
              
              setMessage({
                type: "error",
                text: sub 
                  ? `Tu suscripción está ${sub.status === 'expired' ? 'expirada' : 'inactiva'}. Contacta al administrador para renovarla.`
                  : "No tienes una suscripción activa. Contacta al administrador para activar tu cuenta.",
              })
              setLoading(false)
              return
            }

            // Si la suscripción expira pronto (menos de 7 días), mostrar advertencia
            if (sub.end_date) {
              const daysUntilExpiry = Math.ceil(
                (new Date(sub.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )
              
              if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
                setMessage({
                  type: "info",
                  text: `⚠️ Tu suscripción ${sub.plan?.display_name || ''} expira en ${daysUntilExpiry} día(s). Contacta al administrador para renovarla.`,
                })
              }
            }
          }
        }
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Error al iniciar sesión",
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" 
             style={{
               backgroundImage: `
                 linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
               `,
               backgroundSize: '50px 50px'
             }} />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large floating shapes */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`shape-${i}`}
            className={`absolute rounded-full opacity-10 blur-sm ${
              i % 3 === 0 ? 'bg-gradient-to-br from-blue-400 to-cyan-400' :
              i % 3 === 1 ? 'bg-gradient-to-br from-purple-400 to-pink-400' :
              'bg-gradient-to-br from-indigo-400 to-blue-400'
            }`}
            style={{
              width: Math.random() * 200 + 100,
              height: Math.random() * 200 + 100,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, 0],
              scale: [1, Math.random() * 0.5 + 0.8, 1],
              rotate: [0, 360],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Particles */}
        {mounted && [...Array(50)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -Math.random() * 100 - 50],
              x: [0, Math.random() * 40 - 20],
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="w-full max-w-7xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column - Login Form */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
        <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl shadow-black/25 hover:shadow-black/40 transition-all duration-700 hover:border-white/30">
          <CardHeader className="text-center pb-2">
            <motion.div 
              variants={logoVariants}
              animate="animate"
              className="flex items-center justify-center mb-6"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                {/* Glowing effects */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full blur-xl opacity-60"
                  animate={{
                    scale: [1, 1.4, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                {/* Icon container */}
                <div className="relative bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30">
                  <Building2 className="relative h-12 w-12 text-white drop-shadow-lg" />
                  
                  {/* Sparkles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={`sparkle-${i}`}
                      className="absolute"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `rotate(${i * 60}deg) translateY(-30px)`,
                      }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut"
                      }}
                    >
                      <Sparkles className="h-3 w-3 text-yellow-300 drop-shadow-lg" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="text-5xl font-bold text-white mb-2 drop-shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 25%, #c7d2fe 50%, #a5b4fc 75%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.5))'
              }}
              whileHover={{ scale: 1.02 }}
            >
              ConcreteBill
            </motion.h1>
            
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center gap-2 text-white/80 text-sm font-medium mb-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                ✨
              </motion.div>
              <span>Sistema de Facturación Inteligente</span>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                💎
              </motion.div>
            </motion.div>

            {/* Stats preview */}
            <motion.div
              variants={itemVariants}
              className="flex justify-center gap-6 mb-4"
            >
              {[
                { icon: "📊", label: "Analytics", color: "from-blue-400 to-cyan-400" },
                { icon: "💰", label: "Revenue", color: "from-green-400 to-emerald-400" },
                { icon: "🚀", label: "Growth", color: "from-purple-400 to-pink-400" }
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <motion.div
                    className={`text-2xl mb-1 p-2 rounded-full bg-gradient-to-r ${item.color} inline-block`}
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.5,
                    }}
                  >
                    {item.icon}
                  </motion.div>
                  <div className="text-xs text-white/60">{item.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </CardHeader>

          <CardContent className="p-6">
            <motion.div variants={itemVariants}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/10 backdrop-blur-sm border border-white/20 p-1 rounded-xl">
                  <TabsTrigger 
                    value="signin" 
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/70 backdrop-blur-sm transition-all duration-300 rounded-lg"
                  >
                    <motion.span
                      className="flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      🔑 Iniciar Sesión
                    </motion.span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/70 backdrop-blur-sm transition-all duration-300 rounded-lg"
                  >
                    <motion.span
                      className="flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      ✨ Registrarse
                    </motion.span>
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
                        className={`p-4 rounded-xl border backdrop-blur-sm ${
                          message.type === "error" 
                            ? "border-red-300/30 bg-red-500/10" 
                            : "border-green-300/30 bg-green-500/10"
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
                          <span className={`text-sm font-medium ${
                            message.type === "error" ? "text-red-200" : "text-green-200"
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
                    <motion.div 
                      className="space-y-2"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Label htmlFor="email" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Correo Electrónico
                      </Label>
                      <div className="relative group">
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 h-5 w-5 text-white/60 z-10" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="pl-12 h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl"
                            placeholder="tu@email.com"
                          />
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="space-y-2"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Label htmlFor="password" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Contraseña
                      </Label>
                      <div className="relative group">
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <div className="relative">
                          <Lock className="absolute left-4 top-4 h-5 w-5 text-white/60 z-10" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            className="pl-12 pr-12 h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl"
                            placeholder="••••••••"
                          />
                          <motion.button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4 text-white/60 hover:text-white/90 transition-colors z-10"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="mt-8"
                    >
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl border-0 rounded-xl backdrop-blur-sm relative overflow-hidden group"
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={false}
                        />
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          {loading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Loader2 className="h-5 w-5" />
                              </motion.div>
                              <span>Iniciando sesión...</span>
                            </>
                          ) : (
                            <>
                              <motion.div
                                whileHover={{ rotate: 15 }}
                                transition={{ duration: 0.2 }}
                              >
                                🚀
                              </motion.div>
                              <span>Iniciar Sesión</span>
                            </>
                          )}
                        </div>
                      </Button>
                    </motion.div>

                    {/* Forgot Password Link */}
                    <motion.div 
                      className="text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(true)}
                        className="text-sm text-white/70 hover:text-white/90 underline-offset-4 hover:underline transition-colors flex items-center gap-2 justify-center mx-auto"
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
                        <div className="w-full border-t border-white/20"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 text-white/60 bg-transparent">O continuar con</span>
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
                          className="w-full h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition-all duration-300 rounded-xl"
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
                            <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
                            <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
                            <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
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
                          className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] border-0 text-white backdrop-blur-sm transition-all duration-300 rounded-xl"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
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
                      <Label htmlFor="fullName" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nombre Completo
                      </Label>
                      <div className="relative group">
                        <User className="absolute left-4 top-4 h-5 w-5 text-white/60 z-10" />
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          required
                          className="pl-12 h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl"
                          placeholder="Juan Pérez"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Nombre de la Empresa
                      </Label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-4 h-5 w-5 text-white/60 z-10" />
                        <Input
                          id="companyName"
                          name="companyName"
                          type="text"
                          required
                          className="pl-12 h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl"
                          placeholder="Mi Empresa S.A."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-signup" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Correo Electrónico
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-4 h-5 w-5 text-white/60 z-10" />
                        <Input
                          id="email-signup"
                          name="email"
                          type="email"
                          required
                          className="pl-12 h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl"
                          placeholder="tu@empresa.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password-signup" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Contraseña
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-4 h-5 w-5 text-white/60 z-10" />
                        <Input
                          id="password-signup"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          required
                          className="pl-12 pr-12 h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl"
                          placeholder="••••••••"
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-4 text-white/60 hover:text-white/90 transition-colors z-10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </motion.button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-select" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Plan de Suscripción
                      </Label>
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId} required>
                        <SelectTrigger className="h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl">
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
                        <p className="text-xs text-white/60">
                          {availablePlans.find(p => p.id === selectedPlanId)?.description}
                        </p>
                      )}
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="mt-8"
                    >
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl border-0 rounded-xl backdrop-blur-sm relative overflow-hidden group"
                      >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          {loading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Loader2 className="h-5 w-5" />
                              </motion.div>
                              <span>Creando cuenta...</span>
                            </>
                          ) : (
                            <>
                              <motion.div
                                whileHover={{ rotate: 15 }}
                                transition={{ duration: 0.2 }}
                              >
                                ✨
                              </motion.div>
                              <span>Crear Cuenta</span>
                            </>
                          )}
                        </div>
                      </Button>
                    </motion.div>

                    {/* Social Login Divider */}
                    <motion.div 
                      className="relative my-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 text-white/60 bg-transparent">O regístrate con</span>
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
                          className="w-full h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition-all duration-300 rounded-xl"
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
                            <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
                            <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
                            <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
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
                          className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] border-0 text-white backdrop-blur-sm transition-all duration-300 rounded-xl"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
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
          <p className="text-sm text-white/60">
            Powered by{" "}
            <span className="font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ConcreteBill
            </span>
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
                <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
                  <CardHeader className="text-center pb-4">
                    <motion.div
                      className="flex items-center justify-center mb-4"
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <KeyRound className="h-8 w-8 text-white" />
                      </div>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Restablecer Contraseña
                    </h3>
                    <p className="text-white/70 text-sm">
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
                          className={`p-4 rounded-xl border backdrop-blur-sm ${
                            message.type === "error" 
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
                            <span className={`text-sm font-medium ${
                              message.type === "error" ? "text-red-200" : "text-green-200"
                            }`}>
                              {message.text}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email" className="text-sm font-medium text-white/90 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Correo Electrónico
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 h-5 w-5 text-white/60 z-10" />
                          <Input
                            id="reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            className="pl-12 h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl"
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
                          className="flex-1 h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition-all duration-300 rounded-xl"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-all duration-300 shadow-xl border-0 rounded-xl"
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
          <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl h-full flex flex-col">
            <CardHeader className="text-center pb-2 pt-4">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-2"
              >
                <div className="w-14 h-14 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-1">
                ¡Próximamente!
              </h2>
              <p className="text-white/80 text-xs">
                Servicio por suscripción
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5 flex-1 overflow-y-auto">
              {/* Mensaje Principal */}
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/20 rounded-lg p-2.5 backdrop-blur-sm">
                <p className="text-white/90 text-xs leading-relaxed">
                  🎉 <strong>Regístrate ahora</strong> y obtén acceso <strong className="text-green-400">GRATIS</strong> durante el periodo de prueba.
                </p>
              </div>

              {/* Planes de Suscripción */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></div>
                  Planes Disponibles
                </h3>

                {/* Plan Starter */}
                <motion.div
                  whileHover={{ scale: 1.01, x: 3 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-2.5 backdrop-blur-sm hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">Plan Starter</h4>
                    <span className="text-blue-400 text-[10px] font-medium bg-blue-400/20 px-1.5 py-0.5 rounded">Ideal</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-xl font-bold text-white">$19.99</span>
                    <span className="text-white/60 text-[10px]">/mes</span>
                  </div>
                  <ul className="space-y-0.5 text-white/70 text-[10px]">
                    <li>✓ Hasta 500 facturas/mes</li>
                    <li>✓ Hasta 3 Usuarios</li>
                    <li>✓ 300 Productos/Servicios</li>
                    <li>✓ 100 Clientes</li>
                  </ul>
                </motion.div>

                {/* Plan Professional - Destacado */}
                <motion.div
                  whileHover={{ scale: 1.02, x: 3 }}
                  className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-400/50 rounded-lg p-2.5 backdrop-blur-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                    Popular
                  </div>
                  <div className="flex items-center justify-between mb-1 mt-1">
                    <h4 className="text-white font-semibold text-sm">Plan Professional</h4>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-xl font-bold text-white">$39.99</span>
                    <span className="text-white/60 text-[10px]">/mes</span>
                  </div>
                  <ul className="space-y-0.5 text-white/80 text-[10px]">
                    <li>✓ Hasta 1,000 facturas/mes</li>
                    <li>✓ Hasta 10 Usuarios</li>
                    <li>✓ 1,000 Productos/Servicios</li>
                    <li>✓ 500 Clientes</li>
                  </ul>
                </motion.div>

                {/* Plan Business */}
                <motion.div
                  whileHover={{ scale: 1.01, x: 3 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-2.5 backdrop-blur-sm hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">Plan Business</h4>
                    <span className="text-green-400 text-[10px] font-medium bg-green-400/20 px-1.5 py-0.5 rounded">Full</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-xl font-bold text-white">$59.99</span>
                    <span className="text-white/60 text-[10px]">/mes</span>
                  </div>
                  <ul className="space-y-0.5 text-white/70 text-[10px]">
                    <li>✓ Hasta 5,000 facturas/mes</li>
                    <li>✓ Hasta 20 Usuarios</li>
                    <li>✓ 5,000 Productos/Servicios</li>
                    <li>✓ API Access + Soporte 24/7</li>
                  </ul>
                </motion.div>

                {/* Plan Enterprise */}
                <motion.div
                  whileHover={{ scale: 1.01, x: 3 }}
                  className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-lg p-2.5 backdrop-blur-sm hover:bg-purple-500/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">Plan Enterprise</h4>
                    <span className="text-purple-400 text-[10px] font-medium bg-purple-400/20 px-1.5 py-0.5 rounded">Premium</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-xl font-bold text-white">$89.99</span>
                    <span className="text-white/60 text-[10px]">/mes</span>
                  </div>
                  <ul className="space-y-0.5 text-white/70 text-[10px]">
                    <li>✓ Hasta 10,000 facturas/mes</li>
                    <li>✓ Hasta 50 Usuarios</li>
                    <li>✓ 20,000 Productos/Servicios</li>
                    <li>✓ Multi-sucursales + Premium</li>
                  </ul>
                </motion.div>
              </div>

              {/* Beneficios */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 rounded-lg p-2.5 backdrop-blur-sm">
                <h4 className="text-green-400 font-semibold text-xs mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3" />
                  Incluido en todos:
                </h4>
                <ul className="space-y-0.5 text-white/80 text-[10px]">
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
                <p className="text-white/60 text-[10px]">
                  💡 Precios por anunciarse
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}