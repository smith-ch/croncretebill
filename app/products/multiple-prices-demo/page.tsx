"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function MultiplePricesPage() {

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/products">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Productos
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sistema de Precios Múltiples</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          El sistema de precios múltiples está integrado en el formulario de productos. 
          Puedes configurar diferentes precios para cada producto directamente desde la página de edición.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Cómo usar el Sistema de Precios Múltiples
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Para configurar precios:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Ve a la página de Productos</li>
                <li>Edita un producto existente</li>
                <li>En la sección de Precios Múltiples puedes:</li>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Crear precios por cantidad (ej: 1-10 unidades: $100, 11+ unidades: $90)</li>
                  <li>Establecer precios con fechas de validez</li>
                  <li>Definir precios especiales para tipos de cliente</li>
                  <li>Marcar un precio como predeterminado</li>
                </ul>
              </ol>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Características:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Precios dinámicos según cantidad</li>
                <li>Validez por fechas específicas</li>
                <li>Precios por tipo de cliente</li>
                <li>Selección automática del mejor precio</li>
                <li>Integración completa con facturas</li>
                <li>Gestión centralizada por producto</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-center pt-6">
            <Link href="/products">
              <Button size="lg">
                <Package className="w-4 h-4 mr-2" />
                Ir a Productos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}