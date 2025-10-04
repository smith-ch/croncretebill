"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

function isRedirectError(error: Error): boolean {
  return (
    error.message === "NEXT_REDIRECT" ||
    error.message.includes("NEXT_REDIRECT") ||
    (error as any).digest?.includes("NEXT_REDIRECT") ||
    (error as any).digest === "NEXT_REDIRECT"
  )
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    if (isRedirectError(error)) {
      throw error
    }
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isRedirectError(error)) {
      throw error
    }
    console.error("Error caught by boundary:", error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Algo salió mal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">Ha ocurrido un error inesperado. Por favor, intenta recargar la página.</p>
            {this.state.error && (
              <details className="text-sm text-gray-500">
                <summary>Detalles del error</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">{this.state.error.message}</pre>
              </details>
            )}
            <Button onClick={this.resetError} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
