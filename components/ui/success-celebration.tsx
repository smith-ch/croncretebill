"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SuccessCelebrationProps {
  show: boolean
  onComplete?: () => void
}

export function SuccessCelebration({ show, onComplete }: SuccessCelebrationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; rotation: number; color: string }>>([])

  useEffect(() => {
    if (show) {
      // Generar partículas de confetti
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)]
      }))
      setParticles(newParticles)

      // Limpiar después de la animación
      const timer = setTimeout(() => {
        setParticles([])
        onComplete?.()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                x: particle.x,
                y: particle.y,
                rotate: particle.rotation,
                scale: 0,
                opacity: 1
              }}
              animate={{
                y: window.innerHeight + 100,
                rotate: particle.rotation + 720,
                scale: [0, 1, 1, 0.5],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 2 + Math.random(),
                ease: "easeOut",
                times: [0, 0.1, 0.7, 1]
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ backgroundColor: particle.color }}
            />
          ))}
          
          {/* Círculo de éxito central */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, times: [0, 0.5, 1] }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: 1, ease: "linear" }}
                className="w-32 h-32 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                >
                  <svg
                    className="w-16 h-16 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              </motion.div>
              
              {/* Ondas de propagación */}
              {[0, 0.3, 0.6].map((delay, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.5, delay, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border-4 border-green-400"
                />
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Hook para usar fácilmente el sistema de celebración
export function useSuccessCelebration() {
  const [show, setShow] = useState(false)

  const celebrate = () => {
    setShow(true)
    // Auto-ocultar después de 3 segundos
    setTimeout(() => setShow(false), 3000)
  }

  return { show, celebrate, SuccessCelebration: () => <SuccessCelebration show={show} /> }
}
