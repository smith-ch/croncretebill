"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function KeyboardShortcutsHelper() {
  const [isOpen, setIsOpen] = React.useState(false)

  const shortcuts = [
    { keys: ['Ctrl', 'D'], description: 'Ir al Dashboard', category: 'Navegación' },
    { keys: ['Ctrl', 'F'], description: 'Nueva Factura', category: 'Acciones Rápidas' },
    { keys: ['Ctrl', 'C'], description: 'Gestionar Clientes', category: 'Navegación' },
    { keys: ['Ctrl', 'P'], description: 'Gestionar Productos', category: 'Navegación' },
    { keys: ['Ctrl', 'R'], description: 'Ver Reportes', category: 'Navegación' },
    { keys: ['Ctrl', 'S'], description: 'Configuración', category: 'Navegación' },
    { keys: ['Ctrl', '/'], description: 'Mostrar esta ayuda', category: 'Ayuda' },
    { keys: ['Esc'], description: 'Cerrar modales/diálogos', category: 'General' },
  ]

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, typeof shortcuts>)

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault()
        setIsOpen(true)
      }
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen])

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 p-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Atajos de teclado (Ctrl+/)"
      >
        <Keyboard className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full animate-pulse" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
            Atajos (Ctrl+/)
            <div className="absolute top-full right-4 -mt-1">
              <div className="border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        </div>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal Content */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-full max-w-2xl max-h-[85vh] overflow-hidden"
              >
                <Card className="border-0 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Keyboard className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Atajos de Teclado</CardTitle>
                          <CardDescription className="text-slate-200">
                            Mejora tu productividad con estos atajos
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(false)}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                    <div className="space-y-6">
                      {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {category}
                            </Badge>
                            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                          </div>
                          
                          <div className="space-y-2">
                            {categoryShortcuts.map((shortcut, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-900 transition-colors group"
                              >
                                <span className="text-sm text-slate-300 group-hover:text-slate-900 transition-colors">
                                  {shortcut.description}
                                </span>
                                <div className="flex items-center gap-1">
                                  {shortcut.keys.map((key, keyIndex) => (
                                    <React.Fragment key={keyIndex}>
                                      {keyIndex > 0 && (
                                        <span className="text-slate-400 text-xs mx-1">+</span>
                                      )}
                                      <kbd className="px-2 py-1 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700 rounded shadow-sm group-hover:border-blue-400 group-hover:text-blue-400 transition-colors">
                                        {key}
                                      </kbd>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Tip */}
                      <div className="mt-6 p-4 bg-slate-900 border border-slate-700 rounded-lg">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center">
                              <span className="text-lg">💡</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-blue-900 mb-1">
                              Consejo Pro
                            </h4>
                            <p className="text-xs text-blue-400 leading-relaxed">
                              Los atajos de teclado no funcionan cuando estás escribiendo en campos de texto.
                              En Mac, usa <kbd className="px-1.5 py-0.5 text-xs bg-slate-900 border border-blue-300 rounded">Cmd</kbd> en lugar de <kbd className="px-1.5 py-0.5 text-xs bg-slate-900 border border-blue-300 rounded">Ctrl</kbd>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
