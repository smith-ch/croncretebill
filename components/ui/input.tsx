import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-ring/50",
        modern: "border-input bg-background/50 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-ring/50 focus:bg-background dark:focus:bg-slate-800",
        gradient: "border-gradient focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 hover:border-blue-400 dark:hover:border-blue-500",
        glass: "glass border-white/20 bg-white/5 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 hover:border-white/30 focus:bg-white/10 dark:bg-slate-800/50 dark:border-slate-600",
        glow: "border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-ring/50 focus:shadow-glow focus:border-blue-400 dark:focus:border-blue-500",
        animated: "border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-ring/50 transition-all duration-500 hover:transform hover:scale-[1.02] focus:transform focus:scale-[1.02]",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-2 text-sm",
        lg: "h-12 px-4 text-base",
        xl: "h-14 px-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
