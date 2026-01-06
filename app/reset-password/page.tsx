"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [hasValidToken, setHasValidToken] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const checkToken = async () => {
      try {
        // Verificar si hay un hash en la URL (token de reset) - Método estándar de Supabase
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        
        console.log('Hash params:', { accessToken: !!accessToken, type })
        
        if (type === 'recovery' && accessToken) {
          // Token válido en el hash
          console.log('Token válido encontrado en hash')
          setHasValidToken(true)
          return
        }
        
        // Verificar si ya hay una sesión activa (después de procesar el hash automáticamente)
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Session check:', { hasSession: !!session, error })
        
        if (session) {
          console.log('Sesión activa encontrada')
          setHasValidToken(true)
          return
        }
        
        // No hay token válido ni sesión
        console.log('No se encontró token válido')
        setMessage({
          type: "error",
          text: "Enlace inválido o expirado. Por favor, solicita un nuevo enlace de restablecimiento de contraseña."
        })
        
      } catch (err) {
        console.error('Error en verificación:', err)
        setMessage({
          type: "error",
          text: "Error al verificar el enlace. Por favor, intenta nuevamente."
        })
      }
    }
    
    checkToken()
  }, [])

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Las contraseñas no coinciden"
      })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "La contraseña debe tener al menos 6 caracteres"
      })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      setMessage({
        type: "success",
        text: "¡Contraseña actualizada exitosamente! Redirigiendo al inicio de sesión..."
      })

      // Cerrar sesión para que inicie sesión con la nueva contraseña
      await supabase.auth.signOut()
      
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Error al actualizar la contraseña. El enlace puede haber expirado."
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-3 sm:p-4 md:p-6 relative overflow-hidden">
      {/* Animated Background */}
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
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10 mx-auto"
      >
        <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-3 sm:pb-4 px-4 sm:px-6 pt-6 sm:pt-8">
            <motion.div
              className="flex items-center justify-center mb-3 sm:mb-4"
              animate={{ 
                rotate: [0, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Nueva Contraseña
            </h1>
            <p className="text-white/70 text-xs sm:text-sm px-2">
              Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta
            </p>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <div 
                    className={`p-3 sm:p-4 rounded-xl border backdrop-blur-sm ${
                      message.type === "error" 
                        ? "border-red-300/30 bg-red-500/10" 
                        : "border-green-300/30 bg-green-500/10"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                      {message.type === "error" ? (
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      <span className={`text-xs sm:text-sm font-medium leading-snug ${
                        message.type === "error" ? "text-red-200" : "text-green-200"
                      }`}>
                        {message.text}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {hasValidToken ? (
              <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-white/90 flex items-center gap-1.5 sm:gap-2">
                    <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-white/60 z-10" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-12 sm:h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl text-sm sm:text-base"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-3 sm:top-4 text-white/60 hover:text-white/90 transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-medium text-white/90 flex items-center gap-1.5 sm:gap-2">
                    <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Confirmar Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-white/60 z-10" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-12 sm:h-14 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-300 rounded-xl text-sm sm:text-base"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 sm:right-4 top-3 sm:top-4 text-white/60 hover:text-white/90 transition-colors z-10"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-2 sm:pt-4"
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl border-0 rounded-xl text-sm sm:text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Actualizar Contraseña
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <Link href="/">
                  <Button
                    className="w-full h-12 sm:h-14 bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition-all duration-300 rounded-xl text-sm sm:text-base"
                  >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Volver al Inicio de Sesión
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-4 sm:mt-6 px-4"
        >
          <p className="text-xs sm:text-sm text-white/60">
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
