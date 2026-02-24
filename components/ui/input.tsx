import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-xl border bg-slate-800/80 px-4 py-2.5 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-slate-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-300 text-slate-100 border-slate-700/80 hover:border-slate-500/60 shadow-sm",
  {
    variants: {
      variant: {
        default: "focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0 focus-visible:border-blue-500/60 focus-visible:bg-slate-800 focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]",
        modern: "bg-slate-800/50 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0 focus-visible:border-blue-500/60 focus-visible:bg-slate-800",
        gradient: "border-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0 focus-visible:border-blue-500/60 hover:border-blue-500/40",
        glass: "bg-slate-800/40 backdrop-blur-md border-slate-600/50 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0 focus-visible:border-blue-500/60 hover:border-slate-500/60",
        glow: "focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0 focus-visible:border-blue-500/60 focus-visible:shadow-[0_0_15px_rgba(59,130,246,0.15)]",
        animated: "focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0 hover:translate-y-[-1px] focus:translate-y-[-1px] hover:shadow-md",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-sm rounded-lg",
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
  VariantProps<typeof inputVariants> { }

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
