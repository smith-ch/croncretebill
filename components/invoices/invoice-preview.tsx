"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCurrency } from "@/hooks/use-currency"

interface InvoiceItem {
  id: string
  item_id: string
  item_type: "product" | "service"
  quantity: number
  unit_price: number
}

interface InvoicePreviewProps {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  selectedClient: string
  selectedProject?: string
  clients: any[]
  projects: any[]
  products: any[]
  services: any[]
  items: InvoiceItem[]
  includeItbis: boolean
  ncf: string
  discountType: "percentage" | "fixed"
  discountValue: number
  notes?: string
  paymentMethod?: string
  companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo?: string
  }
}

export function InvoicePreview({
  invoiceNumber,
  invoiceDate,
  dueDate,
  selectedClient,
  selectedProject,
  clients,
  projects,
  products,
  services,
  items,
  includeItbis,
  ncf,
  discountType,
  discountValue,
  notes,
  paymentMethod,
  companyInfo
}: InvoicePreviewProps) {
  const { formatCurrency } = useCurrency()

  // Get client and project info
  const client = clients.find(c => c.id === selectedClient)
  const project = projects.find(p => p.id === selectedProject)

  // Calculate totals
  const validItems = items.filter(item => item.item_id && item.item_id !== "" && item.item_id !== "no-items")
  
  const subtotal = validItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price)
  }, 0)

  // Calculate discount
  let discountAmount = 0
  if (discountValue > 0) {
    if (discountType === "percentage") {
      discountAmount = subtotal * (discountValue / 100)
    } else {
      discountAmount = Math.min(discountValue, subtotal)
    }
  }

  const discountedSubtotal = Math.max(subtotal - discountAmount, 0)
  const itbisAmount = includeItbis ? discountedSubtotal * 0.18 : 0
  const total = discountedSubtotal + itbisAmount

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      return new Date(dateString).toLocaleDateString("es-DO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const getPaymentMethodLabel = (paymentMethod: string) => {
    const paymentMethods: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'credito': 'Crédito',
      'tarjeta': 'Tarjeta',
      'cheque': 'Cheque',
      'transferencia': 'Transferencia',
      'cash': 'Efectivo',
      'credit': 'Crédito',
      'card': 'Tarjeta',
      'check': 'Cheque',
      'transfer': 'Transferencia'
    }
    return paymentMethods[paymentMethod] || 'Crédito'
  }

  const getItemInfo = (item: InvoiceItem) => {
    if (item.item_type === "product") {
      const product = products.find(p => p.id === item.item_id)
      return {
        name: product?.name || "Producto",
        unit: product?.unit || "unidad"
      }
    } else {
      const service = services.find(s => s.id === item.item_id)
      return {
        name: service?.name || "Servicio",
        unit: service?.unit || "servicio"
      }
    }
  }

  return (
    <Card className="w-full max-w-2xl bg-slate-900 shadow-lg">
      <CardHeader className="border-b-2 border-slate-800">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            {companyInfo?.logo && (
              <img 
                src={companyInfo.logo} 
                alt="Logo" 
                className="w-16 h-8 sm:w-20 sm:h-10 object-contain mb-2"
              />
            )}
            <h3 className="text-base sm:text-lg font-bold text-slate-200 truncate">
              {companyInfo?.name || "Mi Empresa"}
            </h3>
            {companyInfo?.address && (
              <p className="text-xs text-slate-400 line-clamp-2">{companyInfo.address}</p>
            )}
            {companyInfo?.phone && (
              <p className="text-xs text-slate-400">Tel: {companyInfo.phone}</p>
            )}
            {companyInfo?.email && (
              <p className="text-xs text-slate-400 truncate">Email: {companyInfo.email}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <Badge variant="secondary" className="mb-2 text-xs">
              VISTA PREVIA
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Invoice Title */}
        <div className="text-center">
          <CardTitle className="text-lg sm:text-xl text-blue-600 mb-4">
            {includeItbis ? "FACTURA DE IMPUESTOS" : "FACTURA"}
          </CardTitle>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-200 mb-2">FACTURAR A:</h4>
              {client ? (
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="font-medium">{client.name}</p>
                  {client.rnc && <p>RNC: {client.rnc}</p>}
                  {client.address && <p className="line-clamp-2">{client.address}</p>}
                  {client.phone && <p>Tel: {client.phone}</p>}
                  {client.email && <p className="truncate">Email: {client.email}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  {selectedClient === "no-client" ? "Sin cliente asignado" : "Seleccionar cliente"}
                </p>
              )}
            </div>

            {project && (
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2">PROYECTO:</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{project.name}</p>
              </div>
            )}
          </div>

          <div className="space-y-4 sm:text-right">
            <div>
              <h4 className="text-sm font-bold text-slate-200 mb-2">FACTURA N°:</h4>
              <p className="text-sm font-medium truncate">{invoiceNumber || "---"}</p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200 mb-2">FECHA:</h4>
              <p className="text-xs text-slate-400">
                {invoiceDate ? formatDate(invoiceDate) : "---"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200 mb-2">VENCIMIENTO:</h4>
              <p className="text-xs text-slate-400">
                {dueDate ? formatDate(dueDate) : "---"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200 mb-2">FORMA DE PAGO:</h4>
              <p className="text-xs text-slate-400">
                {getPaymentMethodLabel(paymentMethod || "credito")}
              </p>
            </div>
          </div>
        </div>

        {/* NCF Section */}
        {includeItbis && (
          <div className="bg-slate-900 p-3 rounded text-center border">
            <p className="text-sm font-bold text-slate-200">
              NCF: {ncf || "Sin NCF especificado"}
            </p>
          </div>
        )}

        {/* Items Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-blue-600 text-white">
            <div className="grid grid-cols-12 gap-1 sm:gap-2 p-2 text-xs font-medium">
              <div className="col-span-6 sm:col-span-5 text-left">DESCRIPCIÓN</div>
              <div className="col-span-2 text-center">CANT.</div>
              <div className="col-span-2 text-center hidden sm:block">PRECIO</div>
              <div className="col-span-2 sm:col-span-3 text-right">IMPORTE</div>
            </div>
          </div>
          
          <div className="divide-y max-h-64 overflow-y-auto">
            {validItems.length > 0 ? (
              validItems.map((item, index) => {
                const itemInfo = getItemInfo(item)
                const itemTotal = item.quantity * item.unit_price
                
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-1 sm:gap-2 p-2 text-xs hover:bg-slate-900">
                    <div className="col-span-6 sm:col-span-5 text-left font-medium">
                      <div className="line-clamp-2">
                        {itemInfo.name}
                        <span className="text-slate-500 ml-1">({itemInfo.unit})</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">{item.quantity}</div>
                    <div className="col-span-2 text-center hidden sm:block">{formatCurrency(item.unit_price)}</div>
                    <div className="col-span-2 sm:col-span-3 text-right font-medium">{formatCurrency(itemTotal)}</div>
                  </div>
                )
              })
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                No hay elementos agregados
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full sm:w-80 border rounded-lg overflow-hidden">
            <div className="divide-y">
              <div className="flex justify-between p-3 text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between p-3 text-sm text-orange-600">
                  <span className="truncate mr-2">Descuento ({discountType === "percentage" ? `${discountValue}%` : "fijo"}):</span>
                  <span className="font-medium flex-shrink-0">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              
              {discountAmount > 0 && (
                <div className="flex justify-between p-3 text-sm">
                  <span>Subtotal con descuento:</span>
                  <span className="font-medium">{formatCurrency(discountedSubtotal)}</span>
                </div>
              )}
              
              {includeItbis && (
                <div className="flex justify-between p-3 text-sm">
                  <span>ITBIS (18%):</span>
                  <span className="font-medium">{formatCurrency(itbisAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between p-3 text-base sm:text-lg font-bold bg-slate-900">
                <span>TOTAL:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="text-right">
          <p className="text-lg font-bold text-slate-200">
            SALDO PENDIENTE: {formatCurrency(total)}
          </p>
        </div>

        {/* Tax Summary for ITBIS invoices */}
        {includeItbis && subtotal > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-bold text-slate-200 mb-3">RESUMEN DE IMPUESTOS</h4>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-800">
                <div className="grid grid-cols-3 gap-2 p-2 text-xs font-medium">
                  <div className="text-center">TASA</div>
                  <div className="text-center">IMPUESTO</div>
                  <div className="text-center">BASE IMPONIBLE</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-2 text-xs">
                <div className="text-center">18%</div>
                <div className="text-center">{formatCurrency(itbisAmount)}</div>
                <div className="text-center">{formatCurrency(discountedSubtotal)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="bg-slate-900 border p-4 rounded">
            <h4 className="text-sm font-bold text-slate-200 mb-2">Notas:</h4>
            <p className="text-xs text-slate-400 whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 border-t pt-4 space-y-1">
          <p>Gracias por su preferencia</p>
          <p>Esta es una vista previa de su factura</p>
        </div>
      </CardContent>
    </Card>
  )
}