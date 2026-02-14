import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 dark:bg-slate-800 dark:border-slate-700",
  {
    variants: {
      variant: {
        default: "border-border bg-card hover:shadow-md dark:hover:shadow-slate-900/50",
        elevated: "shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 dark:shadow-slate-900/50",
        gradient: "bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-700 hover:shadow-lg hover:shadow-blue-500/10 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800",
        glass: "glass backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/20 dark:bg-slate-800/50 dark:border-slate-600",
        glow: "border-slate-700 bg-card hover:shadow-lg hover:shadow-blue-500/25 hover:border-blue-300 dark:border-blue-800 dark:hover:border-blue-600",
        outline: "border-2 border-dashed border-slate-700 hover:border-blue-400 hover:bg-slate-900/50 dark:border-slate-600 dark:hover:border-blue-500 dark:hover:bg-blue-950/20",
        interactive: "cursor-pointer hover:shadow-lg hover:shadow-blue-500/10 transform hover:scale-[1.02] transition-all duration-300 border-border/50 hover:border-blue-300 dark:hover:border-blue-600",
      },
      size: {
        default: "",
        sm: "p-4",
        lg: "p-8",
        xl: "p-10",
      },
      animation: {
        none: "",
        fade: "animate-fade-in",
        slide: "animate-slide-up",
        scale: "animate-scale-in",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, animation, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, animation, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight transition-colors duration-300",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground transition-colors duration-300", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 transition-colors duration-300", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
