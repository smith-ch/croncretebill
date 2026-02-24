"use client"

import { useState, useEffect } from "react"
import { X, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

interface WelcomeTipProps {
    pageKey: string
    message: string
    className?: string
}

export function WelcomeTip({ pageKey, message, className }: WelcomeTipProps) {
    const [visible, setVisible] = useState(false)
    const storageKey = `tip_dismissed_${pageKey}`

    useEffect(() => {
        const dismissed = localStorage.getItem(storageKey)
        if (!dismissed) {
            // Small delay so it feels like the tip appears after the page loads
            const timer = setTimeout(() => setVisible(true), 800)
            return () => clearTimeout(timer)
        }
    }, [storageKey])

    const dismiss = () => {
        setVisible(false)
        localStorage.setItem(storageKey, "true")
    }

    if (!visible) return null

    return (
        <div className={cn(
            "animate-fade-in-down rounded-xl border border-blue-800/50 bg-blue-950/40 backdrop-blur-sm px-4 py-3 flex items-start gap-3 shadow-lg shadow-blue-900/10",
            className
        )}>
            <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-blue-400" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-200 leading-relaxed">{message}</p>
                <button
                    onClick={dismiss}
                    className="text-xs text-blue-400/60 hover:text-blue-300 mt-1.5 transition-colors"
                >
                    No mostrar de nuevo
                </button>
            </div>
            <button
                onClick={dismiss}
                className="flex-shrink-0 p-1 rounded-md hover:bg-blue-800/30 transition-colors"
                aria-label="Cerrar tip"
            >
                <X className="h-4 w-4 text-blue-400/60 hover:text-blue-300" />
            </button>
        </div>
    )
}
