"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
  variant?: "fade" | "slide" | "scale" | "blur" | "bounce"
  delay?: number
  duration?: number
}

const pageVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slide: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  },
  blur: {
    initial: { opacity: 0, filter: "blur(10px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(10px)" }
  },
  bounce: {
    initial: { opacity: 0, y: -60 },
    animate: { 
      opacity: 1, 
      y: 0
    },
    exit: { opacity: 0, y: 60 }
  }
}

export function PageTransition({ 
  children, 
  className, 
  variant = "fade", 
  delay = 0, 
  duration = 0.5 
}: PageTransitionProps) {
  const variants = pageVariants[variant]
  
  const transition = variant === "bounce" 
    ? { duration, delay, type: "spring" as const, stiffness: 100, damping: 15 }
    : { duration, delay }

  return (
    <motion.div
      className={cn("w-full", className)}
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}

interface StaggerContainerProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggerContainer({ 
  children, 
  className, 
  staggerDelay = 0.1 
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps {
  children: React.ReactNode
  className?: string
  variant?: "fade" | "slide" | "scale"
}

export function StaggerItem({ 
  children, 
  className, 
  variant = "fade" 
}: StaggerItemProps) {
  const itemVariants = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    },
    slide: {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0 }
    },
    scale: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 }
    }
  }

  return (
    <motion.div
      className={className}
      variants={itemVariants[variant]}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}

interface FloatingElementProps {
  children: React.ReactNode
  className?: string
  intensity?: "subtle" | "normal" | "strong"
}

export function FloatingElement({ 
  children, 
  className, 
  intensity = "normal" 
}: FloatingElementProps) {
  const intensityMap = {
    subtle: { y: [-2, 2, -2], duration: 4 },
    normal: { y: [-5, 5, -5], duration: 3 },
    strong: { y: [-10, 10, -10], duration: 2 }
  }

  const settings = intensityMap[intensity]

  return (
    <motion.div
      className={className}
      animate={{
        y: settings.y
      }}
      transition={{
        duration: settings.duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  )
}

interface HoverScaleProps {
  children: React.ReactNode
  className?: string
  scale?: number
  rotateOnHover?: boolean
}

export function HoverScale({ 
  children, 
  className, 
  scale = 1.05,
  rotateOnHover = false 
}: HoverScaleProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        scale,
        rotate: rotateOnHover ? 3 : 0,
        transition: { duration: 0.3 }
      }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  )
}

interface ParallaxScrollProps {
  children: React.ReactNode
  className?: string
  offset?: number
}

export function ParallaxScroll({ 
  children, 
  className, 
  offset = 50 
}: ParallaxScrollProps) {
  return (
    <motion.div
      className={className}
      initial={{ y: offset }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

export { AnimatePresence }