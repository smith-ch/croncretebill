"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Download, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateInvoicePDF } from "@/lib/invoice-pdf-generator"

interface InvoicePDFPreviewProps {
  invoiceId: string
  invoiceNumber: string
}

export function InvoicePDFPreview({ invoiceId, invoiceNumber }: InvoicePDFPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const { toast } = useToast()

  const loadPDF = async () => {
    if (pdfUrl) {
      return // Ya está cargado
    }
    
    setIsLoading(true)
    try {
      // Obtener datos de la factura desde el servidor
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)
      if (!response.ok) {
        throw new Error("Error al cargar los datos de la factura")
      }

      const { invoice, companySettings } = await response.json()

      // Generar PDF en el cliente
      const pdfBlob = await generateInvoicePDF(invoice, companySettings)
      const url = window.URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
    } catch (error) {
      console.error("Error loading PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la vista previa del PDF",
        variant: "destructive",
      })
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadPDF = async () => {
    try {
      if (pdfUrl) {
        // Si ya está cargado, descargarlo directamente
        const a = document.createElement("a")
        a.href = pdfUrl
        a.download = `factura-${invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        toast({
          title: "PDF Descargado",
          description: "La factura se ha descargado correctamente.",
        })
      } else {
        // Si no está cargado, generarlo primero
        await loadPDF()
        // Esperar un poco para que se genere
        setTimeout(() => {
          if (pdfUrl) {
            const a = document.createElement("a")
            a.href = pdfUrl
            a.download = `factura-${invoiceNumber}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }
        }, 500)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al descargar el PDF",
        variant: "destructive",
      })
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      loadPDF()
    } else {
      // Limpiar URL cuando se cierre
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 hover:scale-110 active:scale-95 tap-target h-8 w-8 sm:h-9 sm:w-9 p-0" title="Vista previa">
          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Vista Previa - Factura {invoiceNumber}</DialogTitle>
          <DialogDescription>
            Revisa la factura antes de descargarla
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2">Generando PDF personalizado...</span>
            </div>
          ) : pdfUrl ? (
            <>
              <div className="flex justify-end gap-2">
                <Button onClick={downloadPDF} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
              <iframe
                src={pdfUrl}
                className="w-full flex-1 border rounded-lg"
                title="Vista previa de factura"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Error al cargar el PDF
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
