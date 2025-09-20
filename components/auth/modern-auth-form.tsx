"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  EyeOff
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function ModernAuthForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("signin")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

    try {
      const { error } = await supabase.auth.signUp({
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
        console.error('Signup error details:', error)
        throw error
      }

      setMessage({
        type: "success",
        text: "¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta.",
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
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

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
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
    </div>
  )
}