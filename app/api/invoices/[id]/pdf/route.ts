import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection not configured" }, { status: 500 })
    }

    const invoiceId = params.id

    // Get invoice with related data including services
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select(`
        *,
        clients (name, email, phone, address, rnc),
        projects (name),
        drivers (name),
        vehicles (model, plate),
        invoice_items:invoice_items_invoice_id_fkey (
          *,
          products (name, unit),
          services (name, unit)
        )
      `)
      .eq("id", invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    // Get company settings including currency and colors
    const { data: companySettings } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", (invoice as any).user_id)
      .single()

    const currencySymbol = (companySettings as any)?.currency_symbol || "RD$"

    // Get user profile for company info
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", (invoice as any).user_id).single()

    // Generate HTML for PDF
    const html = generateInvoiceHTML(
      invoice,
      profile,
      companySettings,
      currencySymbol,
    )

    // Return HTML response that can be converted to PDF by the client
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="factura-${(invoice as any).invoice_number}.html"`,
      },
    })
  } catch (error) {
    console.error("Error generating invoice PDF:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function generateInvoiceHTML(
  invoice: any,
  profile: any,
  companySettings: any,
  currencySymbol: string,
) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
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

  const isItbisInvoice = invoice.include_itbis
  const invoiceTitle = isItbisInvoice ? "Factura de impuestos" : "FACTURA"
  
  // Personalización
  const primaryColor = companySettings?.invoice_primary_color || '#4a90e2'
  const secondaryColor = companySettings?.invoice_secondary_color || '#f8f9fa'
  const showLogo = companySettings?.invoice_show_logo !== false
  const footerMessage = companySettings?.invoice_footer_message || 'Gracias por su preferencia'
  const invoiceFormat = companySettings?.invoice_format || 'standard'
  
  // Tamaños según formato
  const isCompact = invoiceFormat === 'compact'
  const fontSize = isCompact ? '10px' : '12px'
  const headerPadding = isCompact ? '10px' : '20px'
  const titleSize = isCompact ? '14px' : '20px'
  const sectionMargin = isCompact ? '12px' : '20px'

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura ${invoice.invoice_number}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: ${isCompact ? '1.2' : '1.4'};
                color: #333;
                background: white;
                font-size: ${fontSize};
            }
            
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                padding: ${isCompact ? '12px' : '20px'};
                background: white;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: ${sectionMargin};
                border-bottom: 2px solid ${primaryColor};
                padding-bottom: ${headerPadding};
            }
            
            .company-info {
                flex: 1;
                max-width: 60%;
            }
            
            .company-logo {
                width: 80px;
                height: 40px;
                object-fit: contain;
                margin-bottom: 8px;
            }
            
            .company-name {
                font-size: ${isCompact ? '14px' : '18px'};
                font-weight: bold;
                color: ${primaryColor};
                margin-bottom: ${isCompact ? '3px' : '5px'};
            }
            
            .company-details {
                font-size: ${isCompact ? '9px' : '11px'};
                color: #666;
                line-height: ${isCompact ? '1.2' : '1.3'};
            }
            
            .company-details div {
                margin-bottom: ${isCompact ? '1px' : '2px'};
            }
            
            .company-logo-section {
                text-align: right;
                flex: 1;
                max-width: 35%;
            }
            
            .company-logo-large {
                width: 120px;
                height: 60px;
                object-fit: contain;
                margin-left: auto;
                display: block;
            }
            
            .invoice-title-section {
                text-align: center;
                margin: ${isCompact ? '10px 0' : '20px 0'};
            }
            
            .invoice-title {
                font-size: ${titleSize};
                color: ${primaryColor};
                margin-bottom: ${isCompact ? '8px' : '15px'};
                font-weight: bold;
            }
            
            .invoice-details {
                display: flex;
                justify-content: space-between;
                margin-bottom: ${isCompact ? '12px' : '30px'};
                padding: ${isCompact ? '8px' : '0'};
                ${isCompact ? 'border: 1px solid #e5e7eb; border-radius: 4px;' : ''}
            }
            
            .invoice-left {
                flex: 1;
                margin-right: ${isCompact ? '15px' : '40px'};
            }
            
            .invoice-right {
                flex: 1;
                text-align: right;
            }
            
            .detail-section h4 {
                font-size: ${isCompact ? '9px' : '12px'};
                color: ${primaryColor};
                margin-bottom: ${isCompact ? '3px' : '8px'};
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .detail-section p {
                font-size: ${isCompact ? '9px' : '11px'};
                margin-bottom: ${isCompact ? '2px' : '3px'};
                color: #333;
                font-weight: ${isCompact ? 'normal' : '500'};
            }
            
            .ncf-section {
                background: ${secondaryColor};
                padding: ${isCompact ? '6px' : '10px'};
                border-radius: 4px;
                margin-bottom: ${isCompact ? '10px' : '20px'};
                text-align: center;
                border: 1px solid ${primaryColor};
            }
            
            .ncf-section strong {
                color: ${primaryColor};
                font-size: ${isCompact ? '10px' : '13px'};
                font-weight: 700;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: ${isCompact ? '10px' : '20px'};
                font-size: ${isCompact ? '9px' : '11px'};
            }
            
            .items-table th {
                background: ${primaryColor};
                color: white;
                padding: ${isCompact ? '5px 3px' : '8px 6px'};
                text-align: center;
                font-weight: 600;
                font-size: ${isCompact ? '8px' : '10px'};
                border: 1px solid #ddd;
                ${isCompact ? 'text-transform: uppercase; letter-spacing: 0.5px;' : ''}
            }
            
            .items-table td {
                padding: ${isCompact ? '4px 2px' : '6px'};
                border: 1px solid #ddd;
                text-align: center;
                font-size: ${isCompact ? '9px' : '10px'};
            }
            
            .items-table tr:nth-child(even) {
                background: #f9fafb;
            }
            
            .text-left {
                text-align: left !important;
            }
            
            .text-right {
                text-align: right !important;
            }
            
            .text-center {
                text-align: center !important;
            }
            
            .totals-section {
                display: flex;
                justify-content: flex-end;
                margin-bottom: ${isCompact ? '12px' : '30px'};
            }
            
            .totals {
                width: ${isCompact ? '250px' : '300px'};
                border: 1px solid #ddd;
            }
            
            .totals-row {
                display: flex;
                justify-content: space-between;
                padding: ${isCompact ? '5px 8px' : '8px 12px'};
                border-bottom: 1px solid #ddd;
                font-size: ${isCompact ? '9px' : '12px'};
            }
            
            .totals-row:last-child {
                border-bottom: none;
            }
            
            .totals-row.total {
                font-weight: bold;
                font-size: ${isCompact ? '11px' : '14px'};
                background: ${primaryColor};
                color: white;
            }
            
            .pending-balance {
                text-align: right;
                margin: ${isCompact ? '10px 0' : '20px 0'};
                font-size: ${isCompact ? '12px' : '16px'};
                font-weight: bold;
                color: ${primaryColor};
            }
            
            .tax-summary {
                margin-top: ${isCompact ? '12px' : '30px'};
                border-top: 2px solid ${primaryColor};
                padding-top: ${isCompact ? '10px' : '20px'};
            }
            
            .tax-summary h4 {
                color: ${primaryColor};
                margin-bottom: ${isCompact ? '8px' : '15px'};
                font-size: ${isCompact ? '10px' : '14px'};
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .tax-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
            }
            
            .tax-table th {
                background: ${primaryColor};
                color: white;
                padding: ${isCompact ? '5px' : '8px'};
                text-align: center;
                font-weight: 600;
                border: 1px solid #ddd;
                font-size: ${isCompact ? '9px' : '11px'};
            }
            
            .tax-table td {
                padding: ${isCompact ? '5px' : '8px'};
                border: 1px solid #ddd;
                text-align: center;
                font-size: ${isCompact ? '9px' : '11px'};
            }
            
            .notes {
                margin-top: ${isCompact ? '10px' : '20px'};
                padding: ${isCompact ? '8px' : '15px'};
                background: ${secondaryColor};
                border-left: 4px solid ${primaryColor};
                font-size: ${isCompact ? '9px' : '11px'};
            }
            
            .notes h4 {
                color: ${primaryColor};
                margin-bottom: ${isCompact ? '4px' : '8px'};
                font-size: ${isCompact ? '10px' : '12px'};
                font-weight: bold;
            }
            
            .footer {
                margin-top: ${isCompact ? '15px' : '40px'};
                text-align: center;
                font-size: ${isCompact ? '8px' : '10px'};
                color: #666;
                border-top: 2px solid ${primaryColor};
                padding-top: ${isCompact ? '8px' : '15px'};
            }
            
            .page-info {
                text-align: center;
                margin-top: 20px;
                font-size: 10px;
                color: #999;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
                
                .invoice-container {
                    padding: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div class="company-info">
                    <div class="company-name">${companySettings?.company_name || profile?.company_name || "MI EMPRESA SRL"}</div>
                    <div class="company-details">
                        ${companySettings?.company_address || profile?.company_address ? `<div>${companySettings?.company_address || profile?.company_address}</div>` : ""}
                        ${companySettings?.company_phone || profile?.company_phone ? `<div>${companySettings?.company_phone || profile?.company_phone}</div>` : ""}
                        ${companySettings?.company_email || profile?.email ? `<div>${companySettings?.company_email || profile?.email}</div>` : ""}
                        ${companySettings?.tax_id || profile?.company_rnc ? 
  `<div>RNC: ${companySettings?.tax_id || profile?.company_rnc}</div>` : ""}
                    </div>
                </div>
                <div class="company-logo-section">
                    ${showLogo && companySettings?.company_logo ? `<img src="${companySettings.company_logo}" alt="Logo" class="company-logo-large">` : ""}
                </div>
            </div>
            
            <div class="invoice-title-section">
                <div class="invoice-title">${invoiceTitle}</div>
            </div>
            
            ${
              isItbisInvoice && invoice.ncf
                ? `
                <div class="ncf-section">
                    <strong>NCF: ${invoice.ncf}</strong>
                </div>
            `
                : ""
            }
            
            <div class="invoice-details">
                <div class="invoice-left">
                    <div class="detail-section">
                        <h4>FACTURAR A:</h4>
                        <p><strong>${invoice.clients?.name || "Cliente"}</strong></p>
                        ${invoice.clients?.rnc ? `<p>RNC: ${invoice.clients.rnc}</p>` : ""}
                        ${invoice.clients?.address ? `<p>${invoice.clients.address}</p>` : ""}
                        ${invoice.clients?.phone ? `<p>Tel: ${invoice.clients.phone}</p>` : ""}
                        ${invoice.clients?.email ? `<p>Email: ${invoice.clients.email}</p>` : ""}
                    </div>
                    
                    ${
                      invoice.projects?.name
                        ? `
                        <div class="detail-section" style="margin-top: 15px;">
                            <h4>PROYECTO:</h4>
                            <p>${invoice.projects.name}</p>
                        </div>
                    `
                        : ""
                    }
                </div>
                
                <div class="invoice-right">
                    <div class="detail-section">
                        <h4>FACTURA N°:</h4>
                        <p><strong>${invoice.invoice_number}</strong></p>
                    </div>
                    <div class="detail-section" style="margin-top: 10px;">
                        <h4>FECHA:</h4>
                        <p>${formatDate(invoice.invoice_date)}</p>
                    </div>
                    <div class="detail-section" style="margin-top: 10px;">
                        <h4>CONDICIONES:</h4>
                        <p>Pago en 30 días</p>
                    </div>
                    <div class="detail-section" style="margin-top: 10px;">
                        <h4>FORMA DE PAGO:</h4>
                        <p>${getPaymentMethodLabel(invoice.payment_method)}</p>
                    </div>
                    <div class="detail-section" style="margin-top: 10px;">
                        <h4>FECHA DE VENCIMIENTO:</h4>
                        <p>${formatDate(invoice.due_date)}</p>
                    </div>
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 12%;">FECHA</th>
                        <th style="width: 25%;">DESCRIPCIÓN</th>
                        <th style="width: 15%;">IMPUESTO</th>
                        <th style="width: 8%;">CANT</th>
                        <th style="width: 15%;">TASA</th>
                        <th style="width: 25%;">IMPORTE</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      invoice.invoice_items
                        ?.map((item: any) => {
                          // Get item name from either products or services
                          const itemName = item.products?.name || item.services?.name || item.description || "Elemento"

                          return `
                        <tr>
                            <td>${formatDate(invoice.invoice_date)}</td>
                            <td class="text-left">${itemName}</td>
                            <td>${isItbisInvoice ? "18% S" : "No VAT"}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.unit_price)}</td>
                            <td class="text-right">${formatCurrency(item.total)}</td>
                        </tr>
                    `
                        })
                        .join("") || '<tr><td colspan="6" class="text-center">No hay elementos</td></tr>'
                    }
                </tbody>
            </table>
            
            <div class="totals-section">
                <div class="totals">
                    <div class="totals-row">
                        <span>SUBTOTAL</span>
                        <span>${formatCurrency(invoice.subtotal || 0)}</span>
                    </div>
                    ${
                      isItbisInvoice
                        ? `
                        <div class="totals-row">
                            <span>IMPUESTO</span>
                            <span>${formatCurrency(invoice.tax_amount || 0)}</span>
                        </div>
                    `
                        : ""
                    }
                    <div class="totals-row total">
                        <span>TOTAL</span>
                        <span>${formatCurrency(invoice.total || 0)}</span>
                    </div>
                </div>
            </div>
            
            <div class="pending-balance">
                SALDO PENDIENTE: ${formatCurrency(invoice.total || 0)}
            </div>
            
            ${
              isItbisInvoice
                ? `
                <div class="tax-summary">
                    <h4>RESUMEN DE IMPUESTOS</h4>
                    <table class="tax-table">
                        <thead>
                            <tr>
                                <th>TASA</th>
                                <th>IMPUESTOS DE</th>
                                <th>BASE IMPONIBLE</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>18%</td>
                                <td>${formatCurrency(invoice.tax_amount || 0)}</td>
                                <td>${formatCurrency(invoice.subtotal || 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `
                : ""
            }
            
            ${
              invoice.notes
                ? `
                <div class="notes">
                    <h4>Notas:</h4>
                    <p>${invoice.notes}</p>
                </div>
            `
                : ""
            }
            
            <div class="footer">
                <p>${footerMessage}</p>
                <p>Esta factura fue generada electrónicamente</p>
            </div>
            
            <div class="page-info">
                Page 1 of 2
            </div>
        </div>
        
        <script>
            // Auto-print when opened
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 500);
            }
        </script>
    </body>
    </html>
  `
}
