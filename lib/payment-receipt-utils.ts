import jsPDF from 'jspdf'

// Interfaces para tipos de datos
export interface PaymentReceiptData {
  id: string
  receipt_number: string
  payment_date: string
  payment_method: string
  amount_paid: number
  change_amount: number
  bank_reference?: string
  notes?: string
  issued_by: string
  receipt_type: string
  invoice: {
    id: string
    invoice_number: string
    total_amount: number
    client_name: string
    client: {
      id: string
      name: string
      email: string | null
      rnc: string | null
      phone: string | null
      address: string | null
    } | null
  }
}

export interface CompanyData {
  name: string
  phone: string
  rnc: string
  address: string
  email: string
  website: string
  logo_url: string
}

// Función para obtener etiqueta del método de pago
const getPaymentMethodLabel = (method: string): string => {
  if (!method) return 'Efectivo'
  
  const normalizedMethod = method.toLowerCase().trim()
  const methods: { [key: string]: string } = {
    'cash': 'Efectivo',
    'efectivo': 'Efectivo',
    'credit_card': 'Tarjeta de Crédito',
    'creditcard': 'Tarjeta de Crédito',
    'tarjeta_credito': 'Tarjeta de Crédito',
    'tarjeta de credito': 'Tarjeta de Crédito',
    'tarjeta': 'Tarjeta de Crédito',
    'debit_card': 'Tarjeta de Débito',
    'debitcard': 'Tarjeta de Débito', 
    'tarjeta_debito': 'Tarjeta de Débito',
    'tarjeta de debito': 'Tarjeta de Débito',
    'bank_transfer': 'Transferencia',
    'transferencia': 'Transferencia',
    'transfer': 'Transferencia',
    'check': 'Cheque',
    'cheque': 'Cheque',
    'other': 'Otro',
    'otro': 'Otro'
  }
  return methods[normalizedMethod] || method || 'Efectivo'
}

// Función principal para generar PDF de comprobante de pago
export const generatePaymentReceiptPDF = async (
  receiptData: PaymentReceiptData,
  companyData: CompanyData
) => {
  try {
    // Configuración del PDF - formato más delgado
    const pageWidth = 150
    const pageHeight = 210
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    })

    // Paleta de colores de la web - más vibrante y profesional
    const primaryBlue = '#3b82f6'      // Blue-500 - Color principal de la web
    const primaryBlueDark = '#2563eb'  // Blue-600 - Azul más oscuro  
    const slate700 = '#334155'         // Texto principal oscuro
    const slate500 = '#64748b'         // Texto secundario
    const slate100 = '#f1f5f9'         // Fondo claro
    const slate200 = '#e2e8f0'         // Bordes y divisores
    const blue50 = '#eff6ff'           // Fondo azul muy claro
    
    let currentY = 0

    // ===== FONDO AZUL MUY CLARO DE LA WEB =====
    doc.setFillColor(239, 246, 255) // blue-50 (#eff6ff)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    // ===== HEADER CORPORATIVO CON LOGO - ESTILO WEB =====
    doc.setFillColor(241, 245, 249) // slate-100 - Fondo header
    doc.rect(0, 0, pageWidth, 25, 'F')
    doc.setDrawColor(226, 232, 240) // slate-200 - Borde
    doc.setLineWidth(0.5)
    doc.line(0, 25, pageWidth, 25)

    // Intentar cargar y mostrar logo si existe
    if (companyData?.logo_url) {
      try {
        // Crear imagen para el logo
        const logoImage = new Image()
        logoImage.crossOrigin = 'anonymous'
        
        await new Promise<void>((resolve, reject) => {
          logoImage.onload = () => {
            try {
              // Calcular dimensiones manteniendo proporción original
              const maxWidth = 15  // Ancho máximo en mm
              const maxHeight = 15 // Alto máximo en mm
              
              const originalWidth = logoImage.naturalWidth
              const originalHeight = logoImage.naturalHeight
              
              // Calcular ratio de escala manteniendo proporción
              const scaleRatio = Math.min(maxWidth / (originalWidth * 0.264583), maxHeight / (originalHeight * 0.264583))
              
              // Dimensiones finales manteniendo proporción
              const finalWidth = (originalWidth * 0.264583) * scaleRatio
              const finalHeight = (originalHeight * 0.264583) * scaleRatio
              
              // Centrar logo en el espacio disponible
              const logoX = 8 + (maxWidth - finalWidth) / 2
              const logoY = 4 + (maxHeight - finalHeight) / 2
              
              // Agregar logo al PDF manteniendo proporción original
              doc.addImage(logoImage, 'JPEG', logoX, logoY, finalWidth, finalHeight)
              resolve()
            } catch (error) {
              console.log('Error agregando logo al PDF:', error)
              resolve() // Continuar sin logo
            }
          }
          logoImage.onerror = () => {
            console.log('Error cargando logo:', companyData.logo_url)
            resolve() // Continuar sin logo
          }
          logoImage.src = companyData.logo_url
        })
      } catch (error) {
        console.log('Error procesando logo:', error)
      }
    }

    // Nombre de empresa (ajustar posición si hay logo)
    doc.setTextColor(slate700) // Color del texto principal de la web
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    
    const textStartX = companyData?.logo_url ? 26 : 8 // Mover texto si hay logo
    
    if (companyData?.name && companyData.name !== 'TU EMPRESA') {
      doc.text(companyData.name, textStartX, 11)
    } else {
      doc.text('SISTEMA DE FACTURACIÓN', textStartX, 11)
    }

    // Tipo de documento
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(slate500) // Color secundario de la web
    doc.text('COMPROBANTE ELECTRÓNICO', pageWidth - 8, 11, { align: 'right' })

    currentY = 35 // Ajustar posición inicial por el logo

    // ===== TÍTULO PRINCIPAL CON ESTILO WEB =====
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(primaryBlue) // Azul principal de la web
    doc.text('COMPROBANTE DE PAGO', pageWidth / 2, currentY, { align: 'center' })

    currentY += 15

    // ===== INFORMACIÓN PRINCIPAL CON ESTILO WEB =====
    doc.setFillColor(241, 245, 249) // slate-100 - Fondo de información
    doc.rect(8, currentY, pageWidth - 16, 20, 'F')
    doc.setDrawColor(226, 232, 240) // slate-200 - Borde
    doc.setLineWidth(0.5)
    doc.rect(8, currentY, pageWidth - 16, 20)

    currentY += 6

    // Recibo #
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(slate500)
    doc.text('Recibo #:', 12, currentY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(slate700) // Color principal de la web
    doc.text(receiptData.receipt_number, 35, currentY)

    currentY += 5

    // Fecha
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(slate500)
    doc.text('Fecha:', 12, currentY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(slate700) 
    const formattedDate = new Date(receiptData.payment_date).toLocaleDateString('es-DO')
    doc.text(formattedDate, 35, currentY)

    currentY += 12

    // ===== SECCIÓN DE INFORMACIÓN CON DISEÑO DE DOS COLUMNAS =====
    doc.setTextColor(primaryBlue) // Azul principal para encabezados
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    
    let companyY = currentY // Inicializar companyY
    
    if (companyData && companyData.name !== 'TU EMPRESA') {
      // Título de empresa 
      doc.text('DATOS DE LA EMPRESA:', 12, currentY)
      
      companyY += 5
      
      // Nombre de empresa con salto de línea si es muy largo
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(slate700)
      
      const companyLines = doc.splitTextToSize(companyData.name, 60)
      companyLines.forEach((line: string, index: number) => {
        doc.text(line, 12, companyY + (index * 3))
      })
      companyY = companyY + (companyLines.length * 3)
      
      // RNC
      if (companyData.rnc) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate500)
        doc.text('RNC:', 12, companyY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        doc.text(companyData.rnc, 25, companyY)
        companyY += 3
      }
      
      // Teléfono
      if (companyData.phone) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate500)
        doc.text('Tel:', 12, companyY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        doc.text(companyData.phone, 25, companyY)
        companyY += 3
      }
      
      // Email con salto si es muy largo
      if (companyData.email) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate500)
        doc.text('Email:', 12, companyY)
        companyY += 3
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        const emailLines = doc.splitTextToSize(companyData.email, 60)
        emailLines.forEach((line: string, index: number) => {
          doc.text(line, 12, companyY + (index * 3))
        })
        companyY += emailLines.length * 3
      }
      
      // Dirección con salto si es muy largo
      if (companyData.address) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate500)
        doc.text('Dir:', 12, companyY)
        companyY += 3
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        const addressLines = doc.splitTextToSize(companyData.address, 60)
        addressLines.forEach((line: string, index: number) => {
          doc.text(line, 12, companyY + (index * 3))
        })
        companyY += addressLines.length * 3
      }
    }

    // ===== INFORMACIÓN DEL CLIENTE LADO DERECHO =====
    let clientY = currentY
    if (receiptData.invoice.client) {
      // Título de cliente
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(primaryBlue) // Azul principal para encabezados
      doc.text('INFORMACIÓN DEL CLIENTE:', 75, clientY)
      
      clientY += 5
      
      // Nombre del cliente
      if (receiptData.invoice.client.name) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(slate500)
        doc.text('Cliente:', 75, clientY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        
        const clientNameLines = doc.splitTextToSize(receiptData.invoice.client.name, 60)
        clientNameLines.forEach((line: string, index: number) => {
          doc.text(line, 95, clientY + (index * 3))
        })
        clientY += clientNameLines.length * 3
      }
      
      // RNC del cliente
      if (receiptData.invoice.client.rnc) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate500)
        doc.text('RNC:', 75, clientY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        doc.text(receiptData.invoice.client.rnc, 88, clientY)
        clientY += 3
      }
      
      // Teléfono del cliente
      if (receiptData.invoice.client.phone) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate500)
        doc.text('Tel:', 75, clientY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        doc.text(receiptData.invoice.client.phone, 88, clientY)
        clientY += 3
      }
      
      // Email del cliente con salto si es muy largo
      if (receiptData.invoice.client.email) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate500)
        doc.text('Email:', 75, clientY)
        clientY += 3
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        const clientEmailLines = doc.splitTextToSize(receiptData.invoice.client.email, 60)
        clientEmailLines.forEach((line: string, index: number) => {
          doc.text(line, 75, clientY + (index * 3))
        })
        clientY += clientEmailLines.length * 3
      }
      
      // Dirección del cliente con salto si es muy largo
      if (receiptData.invoice.client.address) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate500)
        doc.text('Dir:', 75, clientY)
        clientY += 3
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(slate700)
        const clientAddressLines = doc.splitTextToSize(receiptData.invoice.client.address, 60)
        clientAddressLines.forEach((line: string, index: number) => {
          doc.text(line, 75, clientY + (index * 3))
        })
        clientY += clientAddressLines.length * 3
      }
    }

    // Usar la Y más alta entre las dos columnas
    currentY = Math.max(companyY || currentY, clientY) + 8

    // ===== DETALLE DEL PAGO CON MARCA DE AGUA =====
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(slate700)
    doc.text('DETALLE DEL PAGO:', 8, currentY)

    // ===== MARCA DE AGUA "PAGADO" + EMPRESA EN DOS LÍNEAS =====
    doc.setTextColor(200, 200, 200) // Gris más notable
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18) // Más grande
    
    // Primera línea: "PAGADO"
    doc.text('PAGADO', 85, currentY + 2, { 
      align: 'left'
    })
    
    // Segunda línea: Nombre de la empresa debajo
    doc.setFontSize(20) // Aún más grande para el nombre
    doc.text(companyData.name || 'EMPRESA', 85, currentY + 10, { 
      align: 'left'
    })

    currentY += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    // Factura
    doc.setTextColor(slate500)
    doc.text('Factura:', 8, currentY) // Más a la izquierda
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(slate700)
    doc.text(receiptData.invoice.invoice_number, 30, currentY) // Más pegado
    currentY += 5

    // Método - Hacer más visible
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(slate500)
    doc.text('Método de Pago:', 8, currentY) // Más a la izquierda
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(slate700)
    const paymentMethodText = getPaymentMethodLabel(receiptData.payment_method || 'cash')
    console.log('Payment method:', receiptData.payment_method, 'Display text:', paymentMethodText) // Debug
    doc.text(paymentMethodText, 45, currentY) // Más pegado

    currentY += 15

    // ===== TOTAL PAGADO CON ESTILO WEB =====
    doc.setFillColor(59, 130, 246) // primaryBlue - Fondo azul del tema
    doc.rect(8, currentY, pageWidth - 16, 12, 'F')
    doc.setDrawColor(37, 99, 235) // primaryBlueDark - Borde azul más oscuro
    doc.setLineWidth(1)
    doc.rect(8, currentY, pageWidth - 16, 12)

    currentY += 8

    // Total con colores del tema
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255) // Texto blanco sobre fondo azul
    doc.text('TOTAL PAGADO:', 12, currentY)
    
    const formattedAmount = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(receiptData.amount_paid)
    
    doc.text(formattedAmount, pageWidth - 12, currentY, { align: 'right' })

    currentY += 8

    // ===== INFORMACIÓN ADICIONAL CON ESTILO WEB =====
    if (receiptData.change_amount > 0) {
      doc.setFillColor(241, 245, 249) // slate-100 - Fondo claro
      doc.rect(8, currentY, pageWidth - 16, 8, 'F')
      doc.setDrawColor(226, 232, 240) // slate-200 - Borde
      doc.setLineWidth(0.5)
      doc.rect(8, currentY, pageWidth - 16, 8)
      
      currentY += 5
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(slate500)
      doc.text('Cambio devuelto:', 12, currentY)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(slate700)
      
      const formattedChange = new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP'
      }).format(receiptData.change_amount)
      
      doc.text(formattedChange, pageWidth - 12, currentY, { align: 'right' })
      currentY += 8
    }

    // ===== FOOTER CON ESTILO WEB =====
    currentY += 10
    
    // Línea divisora con color del tema
    doc.setDrawColor(226, 232, 240) // slate-200
    doc.setLineWidth(0.5)
    doc.line(8, currentY, pageWidth - 8, currentY)
    
    currentY += 5
    
    // Texto de agradecimiento
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(slate500)
    doc.text('¡Gracias por su pago!', pageWidth / 2, currentY, { align: 'center' })
    
    currentY += 4
    
    // Información adicional
    if (receiptData.notes) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(slate500)
      const notesLines = doc.splitTextToSize(receiptData.notes, pageWidth - 16)
      notesLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth / 2, currentY + (index * 3), { align: 'center' })
      })
    }

    // Guardar el PDF
    doc.save(`comprobante-${receiptData.receipt_number}.pdf`)

  } catch (error) {
    console.error('Error generando PDF:', error)
    throw error
  }
}