import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 ring-offset-background placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0 focus-visible:border-blue-500/60 focus-visible:bg-slate-800 focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-500/60 transition-all duration-300 shadow-sm resize-y",
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
