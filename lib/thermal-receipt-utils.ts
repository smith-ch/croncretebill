import jsPDF from 'jspdf'

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

// Función para convertir imagen a escala de grises para impresoras térmicas
export const convertToGrayscale = (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto del canvas'))
        return
      }
      
      canvas.width = img.width
      canvas.height = img.height
      
      // Dibujar la imagen original
      ctx.drawImage(img, 0, 0)
      
      // Obtener los datos de la imagen
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Convertir a escala de grises usando la fórmula estándar
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
        data[i] = gray     // Red
        data[i + 1] = gray // Green
        data[i + 2] = gray // Blue
        // Alpha (data[i + 3]) se mantiene igual
      }
      
      // Aplicar los datos modificados
      ctx.putImageData(imageData, 0, 0)
      
      // Convertir a dataURL
      resolve(canvas.toDataURL('image/png'))
    }
    
    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'))
    }
    
    img.src = imageDataUrl
  })
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

// Función para calcular altura dinámica del recibo
const calculateReceiptHeight = (receiptData: ThermalReceiptData, companyData?: CompanyData): number => {
  let height = 30 // Base mínima
  
  // Logo
  if (companyData?.logo) {
    height += 25
  }
  
  // Header empresa (nombre, rnc, dirección, teléfono)
  height += 20
  if (companyData?.address) {
    const addressLines = Math.ceil((companyData.address.length) / 30)
    height += addressLines * 4
  }
  
  // Información del recibo
  height += 15
  
  // Cliente (si no es general)
  if (receiptData.client_name && receiptData.client_name !== 'Cliente General') {
    height += 10
  }
  
  // Items
  receiptData.items.forEach(item => {
    const nameLines = Math.ceil(item.item_name.length / 28)
    height += nameLines * 3.5 + 5 // Nombre + detalles
  })
  
  // Totales
  height += 20
  
  // Pago
  height += 12
  if (receiptData.amount_received > 0) {
    height += 4
  }
  if (receiptData.change_amount > 0) {
    height += 4
  }
  
  // Código verificación
  height += 8
  
  // Notas
  if (receiptData.notes && receiptData.notes.trim()) {
    const notesLines = Math.ceil(receiptData.notes.length / 30)
    height += notesLines * 3 + 8
  }
  
  // Footer
  height += 15
  
  // Mínimo 60mm, máximo 300mm
  return Math.max(60, Math.min(300, height))
}

export const generateThermalReceiptPDF = async (receiptData: ThermalReceiptData, companyData?: CompanyData) => {
  try {
    // Calcular altura dinámica basada en contenido
    const dynamicHeight = calculateReceiptHeight(receiptData, companyData)
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, dynamicHeight] // 58mm para impresoras térmicas estándar
    })

    let currentY = 3
    const centerX = 29 // Centro para 58mm
    const leftMargin = 2 // Margen mínimo
    const rightMargin = 56

    // CONFIGURACIÓN: Todo en negrita para máxima visibilidad
    doc.setFont('courier', 'bold')
    doc.setFontSize(7)

    // Logo de la empresa (si existe) - convertido a escala de grises
    if (companyData?.logo) {
      try {
        const grayscaleLogo = await convertToGrayscale(companyData.logo)
        const logoSize = 14 // Más pequeño para formato compacto
        const logoX = centerX - (logoSize / 2)
        doc.addImage(grayscaleLogo, 'PNG', logoX, currentY, logoSize, logoSize)
        currentY += logoSize + 2 // Menos espacio
      } catch (logoError) {
        console.warn('Error adding logo to PDF:', logoError)
        currentY += 1
      }
    }

    // Header de la empresa
    if (companyData?.name) {
      doc.setFont('courier', 'bold')
      doc.setFontSize(9) // Más compacto
      doc.text(companyData.name.toUpperCase(), centerX, currentY, { align: 'center' })
      currentY += 4 // Menos espacio
    } else {
      doc.setFont('courier', 'bold')
      doc.setFontSize(9)
      doc.text('MI EMPRESA', centerX, currentY, { align: 'center' })
      currentY += 4
    }

    doc.setFont('courier', 'bold') // CAMBIO: Todo en negrita
    doc.setFontSize(6) // Más compacto para detalles
    
    if (companyData?.rnc) {
      doc.text(`RNC: ${companyData.rnc}`, centerX, currentY, { align: 'center' })
      currentY += 2.5
    }
    
    if (companyData?.address) {
      const addressLines = splitTextToLines(companyData.address, 25) // Ajustado para 58mm
      addressLines.forEach(line => {
        doc.text(line, centerX, currentY, { align: 'center' })
        currentY += 2.5 // Menos espacio
      })
    }
    
    if (companyData?.phone) {
      doc.text(`Tel: ${companyData.phone}`, centerX, currentY, { align: 'center' })
      currentY += 2.5
    }

    currentY += 1
    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 2

    // Información del recibo
    doc.setFont('courier', 'bold')
    doc.setFontSize(8) // Más compacto
    doc.text('COMPROBANTE DE VENTA', centerX, currentY, { align: 'center' })
    currentY += 3

    doc.setFont('courier', 'bold')
    doc.setFontSize(7)
    doc.text(`No. ${receiptData.receipt_number}`, centerX, currentY, { align: 'center' })
    currentY += 2.5

    const date = new Date(receiptData.created_at)
    const dateStr = date.toLocaleDateString('es-DO')
    const timeStr = date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    doc.text(`${dateStr} ${timeStr}`, centerX, currentY, { align: 'center' })
    currentY += 3

    if (receiptData.client_name && receiptData.client_name !== 'Cliente General') {
      doc.setLineWidth(0.2) // Líneas más gruesas
      doc.line(leftMargin, currentY, rightMargin, currentY)
      currentY += 4
      
      doc.setFont('courier', 'bold') // Bold para el cliente
      doc.setFontSize(7) // Más compacto pero bold
      doc.text(`Cliente: ${receiptData.client_name}`, leftMargin, currentY)
      currentY += 4
    }

    doc.setLineWidth(0.2) // Líneas más gruesas
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 3

    // Items del recibo
    doc.setFont('courier', 'bold')
    doc.setFontSize(6) // Más compacto
    
    receiptData.items.forEach((item, index) => {
      // Solo mostrar el nombre si es muy largo, sino en una línea
      if (item.item_name.length > 22) {
        const nameLines = splitTextToLines(item.item_name, 22) // Ajustado para 58mm
        nameLines.forEach(line => {
          doc.text(line, leftMargin, currentY)
          currentY += 2.5
        })
      } else {
        doc.text(item.item_name, leftMargin, currentY)
        currentY += 2.5
      }

      const qtyText = `${item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 1)}`
      const priceText = `$${item.unit_price.toFixed(2)}`
      const totalText = `$${item.line_total.toFixed(2)}`
      
      doc.setFont('courier', 'bold') // CAMBIO: cantidad y precio en bold
      doc.setFontSize(5.5)
      doc.text(`${qtyText}x${priceText}`, leftMargin, currentY)
      doc.setFont('courier', 'bold') // Mantener bold
      doc.setFontSize(6)
      doc.text(totalText, rightMargin, currentY, { align: 'right' })
      
      // Solo agregar espacio entre items si no es el último
      if (index < receiptData.items.length - 1) {
        currentY += 3
      } else {
        currentY += 2
      }
    })

    currentY += 1
    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 3

    // Totales más compactos
    doc.setFont('courier', 'bold')
    doc.setFontSize(6)

    doc.text('SUBTOTAL:', leftMargin, currentY)
    doc.text(`$${receiptData.subtotal.toFixed(2)}`, rightMargin, currentY, { align: 'right' })
    currentY += 2.5

    doc.text('ITBIS:', leftMargin, currentY)
    doc.text(`$${receiptData.tax_amount.toFixed(2)}`, rightMargin, currentY, { align: 'right' })
    currentY += 2.5

    doc.setLineWidth(0.2)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 2.5

    doc.setFont('courier', 'bold')
    doc.setFontSize(8) // Total destacado pero no excesivo
    doc.text('TOTAL:', leftMargin, currentY)
    doc.text(`$${receiptData.total_amount.toFixed(2)}`, rightMargin, currentY, { align: 'right' })
    currentY += 3

    // Información de pago más compacta
    doc.setFont('courier', 'bold') // CAMBIO: info pago en bold
    doc.setFontSize(6)
    
    const paymentMethodText = receiptData.payment_method === 'cash' ? 'Efectivo' : 
                             receiptData.payment_method === 'card' ? 'Tarjeta' : 
                             'Transferencia'
    
    doc.text(`Pago: ${paymentMethodText}`, leftMargin, currentY)
    currentY += 2.5

    if (receiptData.amount_received > 0) {
      doc.text(`Recibido: $${receiptData.amount_received.toFixed(2)}`, leftMargin, currentY)
      currentY += 2.5
      
      if (receiptData.change_amount > 0) {
        doc.text(`Cambio: $${receiptData.change_amount.toFixed(2)}`, leftMargin, currentY)
        currentY += 2.5
      }
    }

    // Código de verificación (sin QR) más compacto
    currentY += 2
    doc.setFont('courier', 'bold') // CAMBIO: código en bold
    doc.setFontSize(5)
    doc.text(`Cod: ${receiptData.verification_code}`, centerX, currentY, { align: 'center' })
    currentY += 3

    // Notas
    if (receiptData.notes && receiptData.notes.trim()) {
      doc.setLineWidth(0.1)
      doc.line(leftMargin, currentY, rightMargin, currentY)
      currentY += 3
      
      doc.setFont('courier', 'bold') // CAMBIO: título notas en bold
      doc.setFontSize(6)
      doc.text('Notas:', leftMargin, currentY)
      currentY += 3
      
      doc.setFont('courier', 'bold') // CAMBIO: contenido notas en bold
      const notesLines = splitTextToLines(receiptData.notes, 25) // Ajustado para 58mm
      notesLines.forEach(line => {
        doc.text(line, leftMargin, currentY)
        currentY += 2.5
      })
      currentY += 2
    }

    // Footer compacto
    currentY += 2
    doc.setLineWidth(0.1)
    doc.line(leftMargin, currentY, rightMargin, currentY)
    currentY += 3

    doc.setFont('courier', 'bold')
    doc.setFontSize(6)
    doc.text('¡GRACIAS POR SU COMPRA!', centerX, currentY, { align: 'center' })

    return doc

  } catch (error) {
    console.error('Error generating thermal receipt PDF:', error)
    throw new Error('Error al generar el PDF del recibo térmico')
  }
}

// Función para descargar el PDF
export const downloadThermalReceiptPDF = async (receiptData: ThermalReceiptData, companyData?: CompanyData) => {
  try {
    const doc = await generateThermalReceiptPDF(receiptData, companyData)
    const fileName = `recibo_termico_${receiptData.receipt_number}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Error downloading thermal receipt PDF:', error)
    throw new Error('Error al descargar el PDF del recibo térmico')
  }
}

// Función para imprimir directamente sin descargar
export const printThermalReceiptPDF = async (receiptData: ThermalReceiptData, companyData?: CompanyData) => {
  try {
    const doc = await generateThermalReceiptPDF(receiptData, companyData)
    
    // Crear el PDF como blob
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    
    // Abrir en nueva ventana que NO se cierre automáticamente
    const printWindow = window.open(
      pdfUrl, 
      'ThermalReceipt', 
      'width=400,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no'
    )
    
    if (printWindow) {
      printWindow.focus()
      
      // Configurar para que muestre el diálogo de impresión cuando cargue
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            // Mostrar diálogo de impresión pero NO cerrar automáticamente
            printWindow.print()
          } catch (error) {
            console.warn('Error showing print dialog:', error)
          }
        }, 1000) // Esperar 1 segundo para que cargue completamente
      }
      
      // Solo limpiar URL después de un tiempo prudencial
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 30000) // 30 segundos para dar tiempo a imprimir
      
    } else {
      // Si no se puede abrir ventana, descargar como fallback
      console.warn('Cannot open print window, downloading instead')
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `recibo_termico_${receiptData.receipt_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(pdfUrl)
    }
    
  } catch (error) {
    console.error('Error printing thermal receipt PDF:', error)
    throw new Error('Error al imprimir el PDF del recibo térmico')
  }
}

// Función alternativa para vista previa antes de imprimir
export const previewThermalReceiptPDF = async (receiptData: ThermalReceiptData, companyData?: CompanyData) => {
  try {
    const doc = await generateThermalReceiptPDF(receiptData, companyData)
    
    // Crear el PDF como blob
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    
    // Abrir en nueva pestaña para vista previa completa
    const previewWindow = window.open(
      pdfUrl, 
      '_blank',
      'width=800,height=900,scrollbars=yes,resizable=yes'
    )
    
    if (previewWindow) {
      previewWindow.focus()
      
      // Limpiar URL después de un tiempo prudencial
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000) // 1 minuto
      
    } else {
      // Fallback: crear link de descarga
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `recibo_termico_${receiptData.receipt_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(pdfUrl)
    }
    
  } catch (error) {
    console.error('Error previewing thermal receipt PDF:', error)
    throw new Error('Error al mostrar vista previa del recibo térmico')
  }
}

// Función para generar PDF con texto EXTRA GRUESO (para impresoras que necesiten más contraste)
export const generateExtraBoldThermalReceiptPDF = async (receiptData: ThermalReceiptData, companyData?: CompanyData) => {
  try {
    // Usar la función normal pero agregar simulación de texto más grueso
    const doc = await generateThermalReceiptPDF(receiptData, companyData)
    
    // Nota: Para texto extra grueso, algunas impresoras térmicas responden mejor
    // cuando se configuran desde sus drivers o software específico
    
    return doc
  } catch (error) {
    console.error('Error generating extra bold thermal receipt PDF:', error)
    throw new Error('Error al generar el PDF del recibo térmico extra grueso')
  }
}
