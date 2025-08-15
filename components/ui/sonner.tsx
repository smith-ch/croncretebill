"use client"

import { Toaster } from "sonner"

function SonnerToasterComponent() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: "shadow-lg rounded-lg border border-slate-200 dark:border-slate-800",
        style: {
          background: "var(--background)",
          color: "var(--foreground)",
        },
      }}
    />
  )
}

export { SonnerToasterComponent as Toaster }
