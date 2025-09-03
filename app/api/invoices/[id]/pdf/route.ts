import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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
      .eq("user_id", invoice.user_id)
      .single()

    const currencySymbol = companySettings?.currency_symbol || "RD$"
    const currencyCode = companySettings?.currency_code || "DOP"
    const primaryColor = companySettings?.primary_color || "#2563eb"
    const secondaryColor = companySettings?.secondary_color || "#1e40af"

    // Get user profile for company info
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", invoice.user_id).single()

    // Generate HTML for PDF
    const html = generateInvoiceHTML(
      invoice,
      profile,
      companySettings,
      currencySymbol,
      currencyCode,
      primaryColor,
      secondaryColor,
    )

    // Return HTML response that can be converted to PDF by the client
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="factura-${invoice.invoice_number}.html"`,
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
  currencyCode: string,
  primaryColor: string,
  secondaryColor: string,
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

  const isItbisInvoice = invoice.include_itbis
  const invoiceTitle = isItbisInvoice ? "Factura de impuestos" : "FACTURA"

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
                line-height: 1.4;
                color: #333;
                background: white;
                font-size: 12px;
            }
            
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: white;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 20px;
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
                font-size: 18px;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            
            .company-details {
                font-size: 11px;
                color: #666;
                line-height: 1.3;
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
                margin: 20px 0;
            }
            
            .invoice-title {
                font-size: 20px;
                color: #4a90e2;
                margin-bottom: 15px;
                font-weight: bold;
            }
            
            .invoice-details {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            
            .invoice-left {
                flex: 1;
                margin-right: 40px;
            }
            
            .invoice-right {
                flex: 1;
                text-align: right;
            }
            
            .detail-section h4 {
                font-size: 12px;
                color: #333;
                margin-bottom: 8px;
                font-weight: bold;
            }
            
            .detail-section p {
                font-size: 11px;
                margin-bottom: 3px;
                color: #666;
            }
            
            .ncf-section {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 20px;
                text-align: center;
            }
            
            .ncf-section strong {
                color: #333;
                font-size: 13px;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 11px;
            }
            
            .items-table th {
                background: #4a90e2;
                color: white;
                padding: 8px 6px;
                text-align: center;
                font-weight: 600;
                font-size: 10px;
                border: 1px solid #ddd;
            }
            
            .items-table td {
                padding: 6px;
                border: 1px solid #ddd;
                text-align: center;
                font-size: 10px;
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
                margin-bottom: 30px;
            }
            
            .totals {
                width: 300px;
                border: 1px solid #ddd;
            }
            
            .totals-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 12px;
                border-bottom: 1px solid #ddd;
                font-size: 12px;
            }
            
            .totals-row:last-child {
                border-bottom: none;
            }
            
            .totals-row.total {
                font-weight: bold;
                font-size: 14px;
                background: #f8f9fa;
            }
            
            .pending-balance {
                text-align: right;
                margin: 20px 0;
                font-size: 16px;
                font-weight: bold;
                color: #333;
            }
            
            .tax-summary {
                margin-top: 30px;
                border-top: 2px solid #e5e7eb;
                padding-top: 20px;
            }
            
            .tax-summary h4 {
                color: #4a90e2;
                margin-bottom: 15px;
                font-size: 14px;
            }
            
            .tax-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
            }
            
            .tax-table th {
                background: #4a90e2;
                color: white;
                padding: 8px;
                text-align: center;
                font-weight: 600;
                border: 1px solid #ddd;
            }
            
            .tax-table td {
                padding: 8px;
                border: 1px solid #ddd;
                text-align: center;
            }
            
            .notes {
                margin-top: 20px;
                padding: 15px;
                background: #f9fafb;
                border-left: 4px solid #4a90e2;
                font-size: 11px;
            }
            
            .notes h4 {
                color: #4a90e2;
                margin-bottom: 8px;
                font-size: 12px;
            }
            
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 10px;
                color: #666;
                border-top: 1px solid #e5e7eb;
                padding-top: 15px;
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
                    ${companySettings?.company_logo ? `<img src="${companySettings.company_logo}" alt="Logo" class="company-logo-large">` : ""}
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
                <p>Gracias por su preferencia</p>
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
