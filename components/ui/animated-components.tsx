"use client"

import * as React from "react"
import { motion, useAnimation, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gradient" | "shine" | "glow"
  size?: "default" | "sm" | "lg" | "icon"
  animation?: "none" | "hover" | "pulse" | "bounce" | "shake" | "tada"
  children: React.ReactNode
}

export function AnimatedButton({
  className,
  variant = "default",
  size = "default",
  animation = "hover",
  children,
  ...props
}: AnimatedButtonProps) {
  const animationVariants = {
    none: {},
    hover: {
      whileHover: { scale: 1.05, y: -2 },
      whileTap: { scale: 0.95 }
    },
    pulse: {
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 2, repeat: Infinity }
    },
    bounce: {
      whileHover: { 
        y: [0, -10, 0],
        transition: { duration: 0.5 }
      }
    },
    shake: {
      whileHover: {
        x: [-2, 2, -2, 2, 0],
        transition: { duration: 0.5 }
      }
    },
    tada: {
      whileHover: {
        scale: [1, 1.1, 1.1, 1.1, 1],
        rotate: [0, -3, 3, -3, 0],
        transition: { duration: 0.6 }
      }
    }
  }

  const currentAnimation = animationVariants[animation]

  return (
    <motion.button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        // Variant styles
        {
          "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
          "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "destructive",
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
          "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
          "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
          "text-primary underline-offset-4 hover:underline": variant === "link",
          "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg": variant === "gradient",
          "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg relative overflow-hidden": variant === "shine",
          "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25": variant === "glow",
        },
        // Size styles
        {
          "h-10 px-4 py-2": size === "default",
          "h-9 rounded-md px-3": size === "sm",
          "h-11 rounded-md px-8": size === "lg",
          "h-10 w-10": size === "icon",
        },
        className
      )}
      {...currentAnimation}
      {...props}
    >
      {variant === "shine" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6 }}
        />
      )}
      {children}
    </motion.button>
  )
}

interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "elevated" | "glass" | "gradient" | "interactive"
  animation?: "none" | "hover" | "float" | "tilt" | "glow" | "scale"
  delay?: number
}

export function AnimatedCard({
  children,
  className,
  variant = "default",
  animation = "hover",
  delay = 0
}: AnimatedCardProps) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })
  const controls = useAnimation()

  React.useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [isInView, controls])

  const animationVariants = {
    none: {},
    hover: {
      whileHover: { 
        y: -5, 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }
    },
    float: {
      animate: { y: [-5, 5, -5] },
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    },
    tilt: {
      whileHover: { 
        rotateY: 5,
        rotateX: 5,
        scale: 1.02
      }
    },
    glow: {
      whileHover: {
        boxShadow: "0 0 30px rgba(59, 130, 246, 0.3)"
      }
    },
    scale: {
      whileHover: { scale: 1.03 }
    }
  }

  const currentAnimation = animationVariants[animation]

  return (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300",
        {
          "hover:shadow-md": variant === "default",
          "shadow-lg hover:shadow-xl": variant === "elevated",
          "backdrop-blur-md bg-white/10 border-white/20": variant === "glass",
          "bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-700": variant === "gradient",
          "cursor-pointer hover:border-blue-300": variant === "interactive",
        },
        className
      )}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { 
            duration: 0.5,
            delay: delay 
          }
        }
      }}
      {...currentAnimation}
    >
      {children}
    </motion.div>
  )
}

interface CounterAnimationProps {
  from: number
  to: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function CounterAnimation({
  from,
  to,
  duration = 2,
  className,
  prefix = "",
  suffix = ""
}: CounterAnimationProps) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = React.useState(from)

  React.useEffect(() => {
    if (isInView) {
      const startTime = Date.now()
      const startValue = from

      const updateCount = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / (duration * 1000), 1)
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const currentValue = Math.round(startValue + (to - startValue) * easeOutCubic)
        
        setCount(currentValue)

        if (progress < 1) {
          requestAnimationFrame(updateCount)
        }
      }

      requestAnimationFrame(updateCount)
    }
  }, [isInView, from, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

interface RevealTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
}

export function RevealText({ 
  text, 
  className, 
  delay = 0, 
  duration = 0.05 
}: RevealTextProps) {
  const letters = text.split("")

  return (
    <motion.span 
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delay,
            staggerChildren: duration
          }
        }
      }}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.span>
  )
}

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showPercentage?: boolean
  animated?: boolean
  gradient?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showPercentage = false,
  animated = true,
  gradient = false
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            gradient 
              ? "bg-gradient-to-r from-blue-500 to-purple-600" 
              : "bg-blue-500"
          )}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{ 
            duration: animated ? 1.5 : 0, 
            ease: "easeOut",
            delay: 0.2 
          }}
        />
      </div>
      {showPercentage && (
        <motion.span
          className="absolute right-0 top-3 text-sm font-medium text-slate-300"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1 }}
        >
          {Math.round(percentage)}%
        </motion.span>
      )}
    </div>
  )
}