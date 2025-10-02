import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface ThermalReceiptData {
  id: string
  receipt_number: string
  client_name: string
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_method: string
  amount_received: number
  change_amount: number
  qr_code: string
  verification_code: string
  notes?: string
  created_at: string
  items: Array<{
    item_name: string
    quantity: number
    unit_price: number
    line_total: number
  }>
}

interface CompanyData {
  name: string
  phone: string
  rnc: string
  address: string
  logo?: string
}

export const generateQRCode = async (data: any): Promise<string> => {
  try {
    const qrData = typeof data === 'string' ? data : JSON.stringify(data)
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Error al generar el código QR')
  }
}

const splitTextToLines = (text: string, maxCharsPerLine: number): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  words.forEach(word => {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        lines.push(word.substring(0, maxCharsPerLine))
        currentLine = word.substring(maxCharsPerLine)
      }
    }
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

export const generateThermalReceiptPDF = async (receiptData: ThermalReceiptData, companyData?: CompanyData) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    })

    let currentY = 3
    const centerX = 40
    const leftMargin = 3
    const rightMargin = 77

    doc.setFont('courier', 'normal')
    doc.setFontSize(7)

    // Logo de la empresa (si existe)
    if (companyData?.logo) {
      try {
        const logoSize = 15
        const logoX = centerX - (logoSize / 2)
        doc.addImage(companyData.logo, 'PNG', logoX, currentY, logoSize, logoSize)
        currentY += logoSize + 3
      } catch (logoError) {
        console.warn('Error adding logo to PDF:', logoError)
        currentY += 2
      }
    }

    // Header de la empresa
    if (companyData?.name) {
      doc.setFont('courier', 'bold')
      doc.setFontSize(10)
      doc.text(companyData.name.toUpperCase(), centerX, currentY, { align: 'center' })
      currentY += 5
    } else {
      doc.setFont('courier', 'bold')
      doc.setFontSize(10)
      doc.text('MI EMPRESA', centerX, currentY, { align: 'center' })
      currentY += 5
    }

    doc.setFont('courier', 'normal')
    doc.setFontSize(6)
    
    if (companyData?.rnc) {
      doc.text(`RNC: ${companyData.rnc}`, centerX, currentY, { align: 'center' })
      currentY += 3
    }
    
    if (companyData?.address) {
      const addressLines = splitTextToLines(companyData.address, 32)
      addressLines.forEach(line => {
        doc.text(line, centerX, currentY, { align: 'center' })
        currentY += 3
      })
    }
    
    if (companyData?.phone) {
      doc.text(`Tel: ${companyData.phone}`, centerX, currentY, { align: 'center' })
      currentY += 3
    }

    currentY += 2
    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 4

    // Información del recibo
    doc.setFont('courier', 'bold')
    doc.setFontSize(8)
    doc.text('COMPROBANTE DE VENTA', centerX, currentY, { align: 'center' })
    currentY += 4

    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    doc.text(`No. ${receiptData.receipt_number}`, centerX, currentY, { align: 'center' })
    currentY += 3

    const date = new Date(receiptData.created_at)
    const dateStr = date.toLocaleDateString('es-DO')
    const timeStr = date.toLocaleTimeString('es-DO')
    doc.text(`${dateStr}, ${timeStr}`, centerX, currentY, { align: 'center' })
    currentY += 4

    if (receiptData.client_name && receiptData.client_name !== 'Cliente General') {
      doc.setLineWidth(0.1)
      doc.line(leftMargin, currentY, rightMargin, currentY)
      currentY += 3
      
      doc.setFont('courier', 'normal')
      doc.setFontSize(7)
      doc.text(`Cliente: ${receiptData.client_name}`, leftMargin, currentY)
      currentY += 4
    }

    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 3

    // Items del recibo
    doc.setFont('courier', 'normal')
    doc.setFontSize(6)
    
    receiptData.items.forEach((item) => {
      const nameLines = splitTextToLines(item.item_name, 30)
      nameLines.forEach(line => {
        doc.text(line, leftMargin, currentY)
        currentY += 2.5
      })

      const qtyText = `${item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)}`
      const priceText = `$${item.unit_price.toFixed(2)}`
      const totalText = `$${item.line_total.toFixed(2)}`
      
      doc.text(`${qtyText} x ${priceText}`, leftMargin + 2, currentY)
      doc.text(totalText, rightMargin, currentY, { align: 'right' })
      currentY += 4
    })

    currentY += 1
    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 3

    // Totales
    doc.setFont('courier', 'normal')
    doc.setFontSize(7)

    doc.text('SUBTOTAL:', leftMargin, currentY)
    doc.text(`$${receiptData.subtotal.toFixed(2)}`, rightMargin, currentY, { align: 'right' })
    currentY += 3

    doc.text('ITBIS (18%):', leftMargin, currentY)
    doc.text(`$${receiptData.tax_amount.toFixed(2)}`, rightMargin, currentY, { align: 'right' })
    currentY += 3

    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 3

    doc.setFont('courier', 'bold')
    doc.setFontSize(8)
    doc.text('TOTAL:', leftMargin, currentY)
    doc.text(`$${receiptData.total_amount.toFixed(2)}`, rightMargin, currentY, { align: 'right' })
    currentY += 5

    // Información de pago
    doc.setFont('courier', 'normal')
    doc.setFontSize(6)
    
    const paymentMethodText = receiptData.payment_method === 'cash' ? 'Efectivo' : 
                             receiptData.payment_method === 'card' ? 'Tarjeta' : 
                             'Transferencia'
    
    doc.text(`Pago: ${paymentMethodText}`, leftMargin, currentY)
    currentY += 3

    if (receiptData.amount_received > 0) {
      doc.text(`Recibido: $${receiptData.amount_received.toFixed(2)}`, leftMargin, currentY)
      currentY += 3
      
      if (receiptData.change_amount > 0) {
        doc.text(`Cambio: $${receiptData.change_amount.toFixed(2)}`, leftMargin, currentY)
        currentY += 3
      }
    }

    // Código QR
    currentY += 2
    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 4

    try {
      // Use a fallback URL for local development
      const baseUrl = (window?.location?.origin || 'https://miempresa.com')
      const finalUrl = baseUrl.includes('localhost') 
        ? 'https://tu-dominio-futuro.com' // Cambia esto por tu dominio de producción
        : baseUrl
      const qrData = `${finalUrl}/system-info`
      
      const qrCodeDataURL = await generateQRCode(qrData)
      
      const qrSize = 20
      const qrX = centerX - (qrSize / 2)
      doc.addImage(qrCodeDataURL, 'PNG', qrX, currentY, qrSize, qrSize)
      currentY += qrSize + 3
      
      doc.setFont('courier', 'normal')
      doc.setFontSize(6)
      doc.text('Verificación Digital', centerX, currentY, { align: 'center' })
      currentY += 3
      doc.text(`Código: ${receiptData.verification_code}`, centerX, currentY, { align: 'center' })
      currentY += 4
      
    } catch (qrError) {
      console.warn('Error generating QR code:', qrError)
      currentY += 3
    }

    // Notas
    if (receiptData.notes && receiptData.notes.trim()) {
      doc.setLineWidth(0.1)
      doc.line(leftMargin, currentY, rightMargin, currentY)
      currentY += 3
      
      doc.setFont('courier', 'normal')
      doc.setFontSize(6)
      doc.text('Notas:', leftMargin, currentY)
      currentY += 3
      
      const notesLines = splitTextToLines(receiptData.notes, 30)
      notesLines.forEach(line => {
        doc.text(line, leftMargin, currentY)
        currentY += 2.5
      })
      currentY += 2
    }

    // Footer
    currentY += 2
    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 4

    doc.setFont('courier', 'bold')
    doc.setFontSize(7)
    doc.text('¡GRACIAS POR SU COMPRA!', centerX, currentY, { align: 'center' })

    const fileName = `recibo_termico_${receiptData.receipt_number}.pdf`
    doc.save(fileName)

  } catch (error) {
    console.error('Error generating thermal receipt PDF:', error)
    throw new Error('Error al generar el PDF del recibo térmico')
  }
}
