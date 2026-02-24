"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    FileText,
    Plus,
    Users,
    Menu,
} from "lucide-react"
import { useState } from "react"

interface TabItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    isAction?: boolean
}

const tabs: TabItem[] = [
    { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
    { name: "Facturas", href: "/invoices", icon: FileText },
    { name: "Crear", href: "/invoices/new", icon: Plus, isAction: true },
    { name: "Clientes", href: "/clients", icon: Users },
    { name: "Más", href: "#menu", icon: Menu },
]

export function MobileBottomTabs({ onMorePress }: { onMorePress?: () => void }) {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/" || pathname === "/dashboard"
        }
        if (href === "#menu") return false
        return pathname?.startsWith(href)
    }

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Gradient fade above the bar */}
            <div className="h-4 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

            {/* Tab bar */}
            <nav
                className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 shadow-2xl shadow-black/50"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
                <div className="flex items-end justify-around px-2 pt-1 pb-1">
                    {tabs.map((tab) => {
                        const active = isActive(tab.href)

                        // The center "Create" button
                        if (tab.isAction) {
                            return (
                                <Link
                                    key={tab.name}
                                    href={tab.href}
                                    className="flex flex-col items-center -mt-4 group"
                                >
                                    <div className="relative">
                                        {/* Glow behind the button */}
                                        <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl scale-150 opacity-0 group-active:opacity-100 transition-opacity duration-300" />
                                        <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 transform transition-all duration-200 active:scale-90 group-hover:shadow-xl group-hover:shadow-blue-500/40 border-2 border-blue-400/30">
                                            <Plus className="h-7 w-7 text-white stroke-[2.5]" />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-blue-400 mt-1">
                                        {tab.name}
                                    </span>
                                </Link>
                            )
                        }

                        // "Más" button triggers the menu
                        if (tab.href === "#menu") {
                            return (
                                <button
                                    key={tab.name}
                                    onClick={onMorePress}
                                    className="flex flex-col items-center py-2 px-3 min-w-[60px] group"
                                >
                                    <div className="relative">
                                        <tab.icon className={cn(
                                            "h-6 w-6 transition-all duration-200 group-active:scale-90",
                                            "text-slate-500 group-hover:text-slate-300"
                                        )} />
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-medium mt-0.5 transition-colors duration-200",
                                        "text-slate-500 group-hover:text-slate-300"
                                    )}>
                                        {tab.name}
                                    </span>
                                </button>
                            )
                        }

                        // Regular tab items
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className="flex flex-col items-center py-2 px-3 min-w-[60px] group"
                            >
                                <div className="relative">
                                    {/* Active indicator dot */}
                                    {active && (
                                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" />
                                    )}
                                    <tab.icon className={cn(
                                        "h-6 w-6 transition-all duration-200 group-active:scale-90",
                                        active
                                            ? "text-blue-400"
                                            : "text-slate-500 group-hover:text-slate-300"
                                    )} />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium mt-0.5 transition-colors duration-200",
                                    active
                                        ? "text-blue-400 font-semibold"
                                        : "text-slate-500 group-hover:text-slate-300"
                                )}>
                                    {tab.name}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
