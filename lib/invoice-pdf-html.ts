/**
 * Genera el HTML de la factura para descarga/vista previa.
 * Usado por GET /api/invoices/[id]/pdf y POST /api/invoices/pdf.
 */
export function generateInvoiceHTML(
  invoice: any,
  profile: any,
  companySettings: any,
  currencySymbol: string,
): string {
  const exchangeRate = companySettings?.usd_exchange_rate || 63.18

  const formatDate = (dateString: string | null | undefined) => {
    if (dateString == null) return "-"
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatUSD = (amount: number) => {
    return `$${(amount / exchangeRate).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatDualCurrency = (amount: number) => {
    const dopAmount = formatCurrency(amount)
    const usdAmount = formatUSD(amount)
    return `<div class="dual-currency"><span class="dual-main">${dopAmount}</span><span class="dual-sub">${usdAmount}</span></div>`
  }

  const getPaymentMethodLabel = (paymentMethod: string) => {
    const map: Record<string, string> = {
      efectivo: "Efectivo", credito: "Crédito", tarjeta: "Tarjeta", cheque: "Cheque",
      transferencia: "Transferencia", cash: "Efectivo", credit: "Crédito", card: "Tarjeta",
      check: "Cheque", transfer: "Transferencia",
    }
    return map[paymentMethod] || "Crédito"
  }

  const isItbisInvoice = invoice.include_itbis
  const invoiceTitle = isItbisInvoice ? "Factura de impuestos" : "FACTURA"
  const primaryColor = companySettings?.invoice_primary_color || "#4a90e2"
  const secondaryColor = companySettings?.invoice_secondary_color || "#f8f9fa"
  const showLogo = companySettings?.invoice_show_logo !== false
  const footerMessage = companySettings?.invoice_footer_message || "Gracias por su preferencia"
  const invoiceFormat = companySettings?.invoice_format || "standard"
  const isCompact = invoiceFormat === "compact"
  const fontSize = isCompact ? "10px" : "12px"
  const headerPadding = isCompact ? "10px" : "20px"
  const titleSize = isCompact ? "14px" : "20px"
  const sectionMargin = isCompact ? "12px" : "20px"

  const invoiceDate = invoice.invoice_date ?? invoice.issue_date

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoice.invoice_number}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0.5in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      line-height: 1.25;
      color: #1a1a1a;
      background: #f5f5f5;
      font-size: 10px;
      width: 100%;
      height: 100%;
    }
    .invoice-container {
      width: 5.75in;
      max-width: 5.75in;
      min-height: 0;
      margin: 0 auto;
      padding: 0.2in 0.35in 0.25in;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      page-break-inside: avoid;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      border-bottom: 2px solid ${primaryColor};
      margin-bottom: 10px;
    }
    .company-info { flex: 1; max-width: 58%; }
    .company-name {
      font-size: 14px;
      font-weight: 700;
      color: ${primaryColor};
      letter-spacing: -0.02em;
      margin-bottom: 3px;
      line-height: 1.2;
    }
    .company-details {
      font-size: 9px;
      color: #5c5c5c;
      line-height: 1.3;
    }
    .company-details > div { margin-bottom: 0; }
    .company-logo-section { text-align: right; flex: 1; max-width: 38%; }
    .company-logo-large {
      width: 48px;
      height: 48px;
      object-fit: contain;
      margin-left: auto;
      display: block;
    }
    .invoice-title-section { text-align: center; margin-bottom: 8px; }
    .invoice-title {
      font-size: 16px;
      font-weight: 700;
      color: ${primaryColor};
      letter-spacing: 0.02em;
    }
    .ncf-section {
      background: ${secondaryColor};
      padding: 5px 12px;
      border-radius: 4px;
      margin-bottom: 10px;
      text-align: center;
      border: 1px solid ${primaryColor};
      font-size: 10px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .ncf-section strong { color: ${primaryColor}; }
    .invoice-details {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 10px;
      padding: 8px 10px;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #eee;
    }
    .invoice-left, .invoice-right { flex: 1; }
    .invoice-right { text-align: right; }
    .detail-section { margin-bottom: 6px; }
    .detail-section:last-child { margin-bottom: 0; }
    .detail-section h4 {
      font-size: 8px;
      font-weight: 700;
      color: #6b7280;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .detail-section p {
      font-size: 10px;
      margin-bottom: 0;
      color: #1a1a1a;
      font-weight: 500;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9px;
      border-radius: 4px;
      overflow: hidden;
    }
    .items-table thead th {
      background: ${primaryColor};
      color: #fff;
      padding: 5px 8px;
      text-align: center;
      font-weight: 600;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .items-table thead th:first-child { text-align: left; padding-left: 10px; }
    .items-table thead th:last-child { text-align: right; padding-right: 10px; }
    .items-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }
    .items-table tbody tr:nth-child(even) { background: #fafafa; }
    .items-table td:first-child { text-align: left; padding-left: 10px; font-weight: 500; }
    .items-table td:last-child { text-align: right; padding-right: 10px; font-weight: 600; }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .dual-currency { line-height: 1.25; }
    .dual-currency .dual-main { display: block; font-weight: 500; }
    .dual-currency .dual-sub { font-size: 0.8em; color: #6b7280; font-weight: 400; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 10px; }
    .totals {
      width: 100%;
      max-width: 3.2in;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 10px;
      border-bottom: 1px solid #eee;
      font-size: 10px;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.total {
      font-weight: 700;
      font-size: 12px;
      background: ${primaryColor};
      color: #fff;
      padding: 8px 10px;
    }
    .totals-row.total .dual-sub { color: rgba(255,255,255,0.88); }
    .notes {
      margin-top: 10px;
      padding: 8px 10px;
      background: #fafafa;
      border-left: 3px solid ${primaryColor};
      border-radius: 0 4px 4px 0;
      font-size: 9px;
      line-height: 1.4;
      color: #374151;
    }
    .notes h4 {
      font-size: 9px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .notes p { margin: 0; white-space: pre-wrap; }
    .footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8px;
      color: #6b7280;
      line-height: 1.3;
    }
    .footer p { margin-bottom: 2px; }
    .footer p:last-child { margin-bottom: 0; color: #9ca3af; }
    @media print {
      body { background: #fff; }
      .invoice-container { box-shadow: none; padding: 0; max-width: none; }
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
          ${companySettings?.company_phone || profile?.company_phone ? `<div>Tel: ${companySettings?.company_phone || profile?.company_phone}</div>` : ""}
          ${companySettings?.company_email || profile?.email ? `<div>${companySettings?.company_email || profile?.email}</div>` : ""}
          ${companySettings?.tax_id || profile?.company_rnc ? `<div>RNC: ${companySettings?.tax_id || profile?.company_rnc}</div>` : ""}
        </div>
      </div>
      <div class="company-logo-section">
        ${showLogo && companySettings?.company_logo ? `<img src="${companySettings.company_logo}" alt="Logo" class="company-logo-large">` : ""}
      </div>
    </div>
    <div class="invoice-title-section"><div class="invoice-title">${invoiceTitle}</div></div>
    ${isItbisInvoice && invoice.ncf ? `<div class="ncf-section"><strong>NCF:</strong> ${invoice.ncf}</div>` : ""}
    <div class="invoice-details">
      <div class="invoice-left">
        <div class="detail-section">
          <h4>Facturar a</h4>
          <p><strong>${invoice.clients?.name || "Cliente"}</strong></p>
          ${invoice.clients?.rnc ? `<p>RNC: ${invoice.clients.rnc}</p>` : ""}
          ${invoice.clients?.address ? `<p>${invoice.clients.address}</p>` : ""}
          ${invoice.clients?.phone ? `<p>Tel: ${invoice.clients.phone}</p>` : ""}
        </div>
        ${invoice.projects?.name ? `<div class="detail-section"><h4>Proyecto</h4><p>${invoice.projects.name}</p></div>` : ""}
      </div>
      <div class="invoice-right">
        <div class="detail-section"><h4>Factura N°</h4><p>${invoice.invoice_number}</p></div>
        <div class="detail-section"><h4>Fecha</h4><p>${formatDate(invoiceDate)}</p></div>
        <div class="detail-section"><h4>Forma de pago</h4><p>${getPaymentMethodLabel(invoice.payment_method || "")}</p></div>
        <div class="detail-section"><h4>Vencimiento</h4><p>${formatDate(invoice.due_date)}</p></div>
      </div>
    </div>
    <table class="items-table">
      <thead>
        <tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr>
      </thead>
      <tbody>
        ${(invoice.invoice_items || []).map((item: any) => {
          const name = item.products?.name || item.services?.name || item.description || "Elemento"
          return `<tr><td class="text-left">${name}</td><td>${item.quantity}</td><td>${formatDualCurrency(item.unit_price || 0)}</td><td class="text-right">${formatDualCurrency(item.total || 0)}</td></tr>`
        }).join("") || "<tr><td colspan='4' style='text-align:center;padding:20px;color:#6b7280'>No hay elementos</td></tr>"}
      </tbody>
    </table>
    <div class="totals-wrap">
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${formatDualCurrency(invoice.subtotal || 0)}</span></div>
        ${isItbisInvoice ? `<div class="totals-row"><span>Impuesto</span><span>${formatDualCurrency(invoice.tax_amount || 0)}</span></div>` : ""}
        <div class="totals-row total"><span>Total</span><span>${formatDualCurrency(invoice.total || 0)}</span></div>
      </div>
    </div>
    ${invoice.notes ? `<div class="notes"><h4>Notas</h4><p>${invoice.notes}</p></div>` : ""}
    <div class="footer"><p>${footerMessage}</p><p>Documento generado electrónicamente</p></div>
  </div>
</body>
</html>`
}
