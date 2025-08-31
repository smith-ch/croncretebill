import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientLayout from "./client-layout"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ConcreteBill - Sistema de Facturación",
  description: "Sistema completo de facturación y gestión empresarial",
  keywords: "facturación, gestión, empresas, contabilidad, presupuestos",
  authors: [{ name: "ConcreteBill Team" }],
  viewport: "width=device-width, initial-scale=1",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.className}>
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <ClientLayout>{children}</ClientLayout>
          <Toaster />
          <Sonner />
        </ErrorBoundary>
      </body>
    </html>
  )
}
