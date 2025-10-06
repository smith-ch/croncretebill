'use client'

import { useState } from 'react'
import { Download, X, Smartphone, Monitor, Info } from 'lucide-react'
import { usePWAInstall } from '@/hooks/use-pwa-install'

interface PWAInstallBannerProps {
  className?: string
  variant?: 'banner' | 'button' | 'modal'
  onClose?: () => void
}

export default function PWAInstallBanner({ 
  className = '', 
  variant = 'banner',
  onClose 
}: PWAInstallBannerProps) {
  const { isInstalled, canInstall, install, getInstallInstructions } = usePWAInstall()
  const [showInstructions, setShowInstructions] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  if (isInstalled || !canInstall) {
    return null
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    const success = await install()
    setIsInstalling(false)
    
    if (!success) {
      setShowInstructions(true)
    }
  }

  const instructions = getInstallInstructions()

  if (variant === 'button') {
    return (
      <button
        onClick={handleInstall}
        disabled={isInstalling}
        className={`inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 ${className}`}
      >
        <Download className="w-4 h-4 mr-2" />
        {isInstalling ? 'Instalando...' : 'Instalar App'}
      </button>
    )
  }

  if (variant === 'modal' && showInstructions) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Instalar ConcreteBill
            </h3>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center mb-3">
              {instructions.browser.includes('iOS') ? (
                <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
              ) : (
                <Monitor className="w-5 h-5 text-blue-600 mr-2" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {instructions.browser}
              </span>
            </div>
            
            <ol className="space-y-2">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          
          <button
            onClick={() => setShowInstructions(false)}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Instalar ConcreteBill
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Instala la app para acceso rápido y funcionalidad offline
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md font-medium disabled:opacity-50"
                >
                  <Download className="w-3 h-3 mr-1" />
                  {isInstalling ? 'Instalando...' : 'Instalar'}
                </button>
                <button
                  onClick={() => setShowInstructions(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 text-sm rounded-md font-medium"
                >
                  <Info className="w-3 h-3 mr-1" />
                  Instrucciones
                </button>
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {showInstructions && (
        <PWAInstallBanner 
          variant="modal" 
          onClose={() => setShowInstructions(false)} 
        />
      )}
    </>
  )
}