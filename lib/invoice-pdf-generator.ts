import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface InvoiceData {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  total: number
  notes?: string
  include_itbis: boolean
  payment_method: string
  clients?: {
    name: string
    email?: string
    phone?: string
    address?: string
    rnc?: string
  }
  projects?: {
    name: string
  }
  invoice_items?: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
    products?: { name: string; unit: string }
    services?: { name: string; unit: string }
  }>
}

interface CompanySettings {
  company_name?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_rnc?: string
  company_website?: string
  company_logo?: string
  currency_symbol?: string
  usd_exchange_rate?: number
  invoice_primary_color?: string
  invoice_secondary_color?: string
  invoice_format?: string
  invoice_footer_message?: string
  invoice_show_logo?: boolean
}

export async function generateInvoicePDF(
  invoice: InvoiceData,
  companySettings: CompanySettings
): Promise<Blob> {
  // Configuración de colores (con valores por defecto)
  const primaryColor = companySettings.invoice_primary_color || '#3b82f6'
  const secondaryColor = companySettings.invoice_secondary_color || '#64748b'
  const currencySymbol = companySettings.currency_symbol || 'RD$'
  const exchangeRate = companySettings.usd_exchange_rate || 63.18
  
  // Convertir colores hex a RGB para jsPDF
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 } // default blue
  }

  const primaryRgb = hexToRgb(primaryColor)
  const secondaryRgb = hexToRgb(secondaryColor)

  // Crear documento PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = 15

  // Helper para formatear moneda
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  // Helper para formatear USD
  const formatUSD = (amount: number) => {
    return `$${(amount / exchangeRate).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  // Helper para formato dual (DOP y USD)
  const formatDualCurrency = (amount: number) => {
    const dopAmount = formatCurrency(amount)
    const usdAmount = formatUSD(amount)
    return `${dopAmount} (${usdAmount})`
  }

  // Helper para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // ========== ENCABEZADO ==========
  
  // Logo de la empresa (si está habilitado y existe)
  if (companySettings.invoice_show_logo !== false && companySettings.company_logo) {
    try {
      // Intentar cargar el logo
      const img = new Image()
      img.src = companySettings.company_logo
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        setTimeout(reject, 3000) // timeout de 3 segundos
      })
      doc.addImage(img, 'PNG', 15, yPos, 40, 20)
    } catch (error) {
      console.error('Error loading logo:', error)
    }
  }

  // Información de la empresa (lado derecho)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.text(companySettings.company_name || 'Empresa', pageWidth - 15, yPos + 5, { align: 'right' })
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b)
  
  yPos += 10
  if (companySettings.company_rnc) {
    doc.text(`RNC: ${companySettings.company_rnc}`, pageWidth - 15, yPos, { align: 'right' })
    yPos += 4
  }
  if (companySettings.company_address) {
    doc.text(companySettings.company_address, pageWidth - 15, yPos, { align: 'right' })
    yPos += 4
  }
  if (companySettings.company_phone) {
    doc.text(`Tel: ${companySettings.company_phone}`, pageWidth - 15, yPos, { align: 'right' })
    yPos += 4
  }
  if (companySettings.company_email) {
    doc.text(companySettings.company_email, pageWidth - 15, yPos, { align: 'right' })
    yPos += 4
  }

  yPos += 10

  // ========== TÍTULO DE FACTURA ==========
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  const invoiceTitle = invoice.include_itbis ? 'FACTURA CON ITBIS' : 'FACTURA'
  doc.text(invoiceTitle, 15, yPos)
  
  yPos += 3
  // Línea decorativa
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.setLineWidth(1)
  doc.line(15, yPos, 80, yPos)
  
  yPos += 10

  // ========== INFORMACIÓN DE FACTURA Y CLIENTE ==========
  
  // Cuadro de información de factura
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.rect(15, yPos, 85, 42, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FACTURA:', 18, yPos + 6)
  doc.text('FECHA:', 18, yPos + 13)
  doc.text('VENCIMIENTO:', 18, yPos + 20)
  doc.text('ESTADO:', 18, yPos + 27)
  doc.text('TASA USD:', 18, yPos + 34)
  
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoice_number, 45, yPos + 6)
  doc.text(formatDate(invoice.invoice_date), 45, yPos + 13)
  doc.text(formatDate(invoice.due_date), 45, yPos + 20)
  
  const statusText = invoice.status === 'pagada' ? 'PAGADA' : 
                     invoice.status === 'enviada' ? 'PENDIENTE' : 
                     invoice.status.toUpperCase()
  doc.text(statusText, 45, yPos + 27)
  doc.text(`1 USD = ${exchangeRate.toFixed(2)} ${currencySymbol.replace('$', '')}`, 45, yPos + 34)

  // Cuadro de información del cliente
  if (invoice.clients) {
    doc.setDrawColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b)
    doc.setLineWidth(0.5)
    doc.rect(110, yPos, pageWidth - 125, 42)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
    doc.text('CLIENTE:', 113, yPos + 6)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.clients.name, 113, yPos + 12)
    
    if (invoice.clients.rnc) {
      doc.setFontSize(9)
      doc.text(`RNC: ${invoice.clients.rnc}`, 113, yPos + 18)
    }
    if (invoice.clients.phone) {
      doc.text(`Tel: ${invoice.clients.phone}`, 113, yPos + 24)
    }
    if (invoice.clients.email) {
      doc.text(invoice.clients.email, 113, yPos + 30)
    }
  }

  yPos += 52

  // ========== TABLA DE PRODUCTOS/SERVICIOS ==========
  
  const tableData = invoice.invoice_items?.map(item => {
    const itemName = item.products?.name || item.services?.name || item.description
    const unit = item.products?.unit || item.services?.unit || 'Unidad'
    
    return [
      itemName,
      unit,
      item.quantity.toString(),
      formatDualCurrency(item.unit_price),
      formatDualCurrency(item.total)
    ]
  }) || []

  autoTable(doc, {
    startY: yPos,
    head: [['DESCRIPCIÓN', 'UNIDAD', 'CANT.', 'PRECIO UNITARIO', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 55, halign: 'left' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 45, halign: 'right' },
      4: { cellWidth: 45, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 15, right: 15 }
  })

  // Obtener posición Y después de la tabla
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50

  // ========== TOTALES ==========
  
  const totalsX = pageWidth - 70
  let totalsY = finalY + 10

  // Cuadro de totales con fondo
  doc.setFillColor(248, 250, 252)
  doc.rect(totalsX - 5, totalsY - 5, 60, invoice.include_itbis ? 28 : 20, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  // Subtotal
  doc.text('Subtotal:', totalsX, totalsY)
  doc.text(formatDualCurrency(invoice.subtotal), pageWidth - 20, totalsY, { align: 'right' })
  totalsY += 6

  // ITBIS (si aplica)
  if (invoice.include_itbis) {
    doc.text('ITBIS (18%):', totalsX, totalsY)
    doc.text(formatDualCurrency(invoice.tax_amount), pageWidth - 20, totalsY, { align: 'right' })
    totalsY += 6
  }

  // Total (destacado)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.text('TOTAL:', totalsX, totalsY)
  doc.text(formatDualCurrency(invoice.total), pageWidth - 20, totalsY, { align: 'right' })

  // ========== NOTAS Y MENSAJE PERSONALIZADO ==========
  
  totalsY += 15

  if (invoice.notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b)
    doc.text('NOTAS:', 15, totalsY)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 30)
    doc.text(notesLines, 15, totalsY + 5)
    totalsY += notesLines.length * 4 + 10
  }

  // Mensaje personalizado del pie de página
  if (companySettings.invoice_footer_message) {
    if (totalsY > pageHeight - 40) {
      doc.addPage()
      totalsY = 20
    }
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b)
    const footerLines = doc.splitTextToSize(companySettings.invoice_footer_message, pageWidth - 30)
    doc.text(footerLines, 15, totalsY)
  }

  // ========== PIE DE PÁGINA ==========
  
  const footerY = pageHeight - 20
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.setLineWidth(0.5)
  doc.line(15, footerY, pageWidth - 15, footerY)
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b)
  doc.text('Gracias por su preferencia', pageWidth / 2, footerY + 5, { align: 'center' })
  doc.text(`Factura generada electrónicamente - ${new Date().toLocaleDateString('es-ES')}`, 
           pageWidth / 2, footerY + 10, { align: 'center' })
  
  if (companySettings.company_website) {
    doc.text(companySettings.company_website, pageWidth / 2, footerY + 15, { align: 'center' })
  }

  // Retornar el PDF como Blob
  return doc.output('blob')
}
