"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye, Download, Loader2 } from "lucide-react"

interface BudgetPDFGeneratorProps {
  budget: any
  settings: any
}

export function BudgetPDFGenerator({ budget, settings }: BudgetPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const formatCurrency = (amount: number) => {
    const currencySymbol = settings?.currency_symbol || "RD$"
    return `${currencySymbol}${(amount || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("es-DO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      borrador: "BORRADOR",
      enviado: "ENVIADO",
      aprobado: "APROBADO",
      rechazado: "RECHAZADO",
    }
    return statusMap[status] || status.toUpperCase()
  }

  const generateHTML = () => {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Presupuesto ${budget.budget_number || budget.id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.3;
          color: #2d3748;
          background: #ffffff;
          padding: 12px;
          max-width: 1150px;
          margin: 0 auto;
          font-size: 12px;
        }
        
        .print-controls {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .btn {
          background: #4a5568;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(74, 85, 104, 0.2);
        }
        
        .btn:hover {
          background: #2d3748;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(74, 85, 104, 0.3);
        }
        
        .btn-secondary {
          background: #718096;
          box-shadow: 0 2px 4px rgba(113, 128, 150, 0.2);
        }
        
        .btn-secondary:hover {
          background: #4a5568;
          box-shadow: 0 4px 8px rgba(113, 128, 150, 0.3);
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .company-info {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          flex: 1;
        }
        
        .company-logo {
          flex-shrink: 0;
        }
        
        .company-logo img {
          max-width: 100px;
          max-height: 100px;
          object-fit: contain;
          border-radius: 6px;
        }
        
        .company-details h1 {
          font-size: 22px;
          color: #2d3748;
          margin-bottom: 8px;
          font-weight: 700;
          line-height: 1.2;
        }
        
        .company-details p {
          margin: 3px 0;
          color: #4a5568;
          font-size: 12px;
          line-height: 1.3;
        }
        
        .budget-info {
          text-align: right;
          flex-shrink: 0;
          min-width: 300px;
          padding-left: 20px;
        }
        
        .budget-title {
          font-size: 32px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 8px;
          line-height: 1.1;
        }
        
        .budget-number {
          font-size: 18px;
          color: #4a5568;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .budget-details {
          text-align: right;
        }
        
        .budget-details p {
          margin: 4px 0;
          font-size: 12px;
          color: #718096;
        }
        
        .budget-details strong {
          color: #2d3748;
        }
        
        .client-section {
          background: #f7fafc;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          border-left: 4px solid #4a5568;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .client-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .client-item {
          margin-bottom: 6px;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        
        .client-label {
          font-weight: 600;
          color: #4a5568;
          min-width: 70px;
          flex-shrink: 0;
          font-size: 11px;
        }
        
        .client-value {
          color: #2d3748;
          flex: 1;
          word-break: break-word;
          font-size: 11px;
        }
        
        .items-section {
          margin: 16px 0;
        }
        
        .items-table-container {
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          background: white;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }
        
        .items-table thead {
          background: #4a5568;
        }
        
        .items-table th {
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        
        .items-table td {
          padding: 8px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 11px;
          vertical-align: top;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #f7fafc;
        }
        
        .items-table tbody tr:hover {
          background: #edf2f7;
        }
        
        .item-name {
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 3px;
          font-size: 12px;
          line-height: 1.2;
        }
        
        .item-description {
          font-size: 10px;
          color: #4a5568;
          font-style: italic;
          line-height: 1.3;
          margin-top: 2px;
        }
        
        .text-right {
          text-align: right;
        }
        
        .text-center {
          text-align: center;
        }
        
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }
        
        .totals-table {
          background: white;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          min-width: 260px;
        }
        
        .totals-table td {
          padding: 8px 14px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
        }
        
        .totals-table .subtotal-row {
          background: #f7fafc;
        }
        
        .totals-table .tax-row {
          background: #fef5e7;
        }
        
        .totals-table .total-row {
          background: #4a5568;
          color: white;
          font-weight: 700;
          font-size: 13px;
        }
        
        .notes-section {
          margin-top: 16px;
          background: #f7fafc;
          padding: 12px;
          border-radius: 4px;
          border-left: 4px solid #718096;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .notes-content {
          color: #4a5568;
          line-height: 1.4;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 11px;
        }
        
        .footer {
          margin-top: 16px;
          text-align: center;
          color: #718096;
          font-size: 9px;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .status-borrador {
          background: #edf2f7;
          color: #2d3748;
        }
        
        .status-enviado {
          background: #bee3f8;
          color: #2b6cb0;
        }
        
        .status-aprobado {
          background: #c6f6d5;
          color: #276749;
        }
        
        .status-rechazado {
          background: #fed7d7;
          color: #c53030;
        }
        
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
          }
          
          body {
            padding: 6px;
            font-size: 10px;
            max-width: none;
          }
          
          .print-controls {
            display: none !important;
          }
          
          .header {
            display: flex;
            justify-content: flex-start;
            align-items: flex-start;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #e2e8f0;
            min-height: 80px;
            position: relative;
          }
          
          .company-info {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            flex: 1;
            max-width: 100%;
            padding-top: 5px;
            padding-right: 45%;
          }
          
          .company-logo {
            flex-shrink: 0;
          }
          
          .company-logo img {
            max-width: 100px;
            max-height: 100px;
            object-fit: contain;
            border-radius: 6px;
          }
          
          .company-details h1 {
            font-size: 18px;
            margin-bottom: 4px;
            line-height: 1.1;
          }
          
          .company-details p {
            margin: 1px 0;
            font-size: 9px;
            line-height: 1.2;
          }
          
          .budget-info {
            position: absolute;
            top: 0;
            right: 0;
            text-align: right;
            min-width: 40%;
            max-width: 40%;
            padding: 0;
            margin: 0;
            z-index: 10;
          }
          
          .budget-title {
            font-size: 26px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 4px;
            line-height: 1;
            text-align: right;
            width: 100%;
          }
          
          .budget-number {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 6px;
            font-weight: 600;
            line-height: 1.1;
            text-align: right;
            width: 100%;
          }
          
          .budget-details {
            text-align: right;
            margin-top: 2px;
            width: 100%;
          }
          
          .budget-details p {
            margin: 2px 0;
            font-size: 10px;
            color: #718096;
            line-height: 1.2;
            text-align: right;
          }
          
          .budget-details strong {
            color: #2d3748;
            font-weight: 600;
          }
          
          .status-badge {
            padding: 2px 6px;
            font-size: 8px;
            margin-top: 2px;
            float: right;
          }
          
          .client-section,
          .notes-section {
            padding: 8px;
            margin-bottom: 10px;
          }
          
          .client-grid {
            gap: 12px;
          }
          
          .client-item {
            margin-bottom: 4px;
          }
          
          .client-label {
            font-size: 9px;
            min-width: 60px;
          }
          
          .client-value {
            font-size: 9px;
          }
          
          .items-section {
            margin: 10px 0;
          }
          
          .items-table th,
          .items-table td {
            padding: 5px 4px;
            font-size: 8px;
          }
          
          .item-name {
            font-size: 9px;
            margin-bottom: 1px;
          }
          
          .item-description {
            font-size: 8px;
            line-height: 1.1;
            margin-top: 2px;
            color: #4a5568;
          }
          
          .totals-section {
            margin-top: 10px;
          }
          
          .totals-table {
            min-width: 220px;
          }
          
          .totals-table td {
            padding: 5px 8px;
            font-size: 9px;
          }
          
          .totals-table .total-row {
            font-size: 10px;
          }
          
          .footer {
            margin-top: 10px;
            padding-top: 6px;
            font-size: 7px;
          }
          
          .section-title {
            font-size: 9px;
            margin-bottom: 6px;
          }
          
          .notes-content {
            font-size: 8px;
            line-height: 1.2;
          }
        }
        
        @media (max-width: 1024px) {
          body {
            padding: 10px;
            font-size: 11px;
          }
          
          .print-controls {
            position: relative;
            top: auto;
            right: auto;
            margin-bottom: 12px;
            flex-direction: row;
            justify-content: center;
          }
          
          .header {
            flex-direction: column;
            text-align: left;
          }
          
          .budget-info {
            text-align: left;
            margin-top: 12px;
            padding-left: 0;
          }
          
          .company-info {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .client-grid {
            grid-template-columns: 1fr;
          }
          
          .company-logo img {
            max-width: 100px;
            max-height: 100px;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-controls">
        <button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
        <button class="btn btn-secondary" onclick="window.close()">Cerrar</button>
      </div>
      
      <div class="header">
        <div class="company-info">
          ${
            settings?.company_logo
              ? `
          <div class="company-logo">
            <img src="${settings.company_logo}" alt="Logo de la empresa" onerror="this.style.display='none'" />
          </div>
          `
              : ""
          }
          <div class="company-details">
            <h1>${settings?.company_name || "Mi Empresa"}</h1>
            ${settings?.company_address ? `<p><strong>Dirección:</strong> ${settings.company_address}</p>` : ""}
            ${settings?.company_phone ? `<p><strong>Teléfono:</strong> ${settings.company_phone}</p>` : ""}
            ${settings?.company_email ? `<p><strong>Email:</strong> ${settings.company_email}</p>` : ""}
            <p><strong>RNC:</strong> ${settings?.company_rnc || "No configurado"}</p>
          </div>
        </div>
        <div class="budget-info">
          <div class="budget-title">PRESUPUESTO</div>
          <div class="budget-number">${budget.budget_number || `PRES-${budget.id.slice(0, 8)}`}</div>
          <div class="budget-details">
            <p><strong>Fecha:</strong> ${formatDate(budget.budget_date)}</p>
            ${budget.valid_until ? `<p><strong>Válido hasta:</strong> ${formatDate(budget.valid_until)}</p>` : ""}
            <p><span class="status-badge status-${budget.status}">${getStatusText(budget.status)}</span></p>
          </div>
        </div>
      </div>

      <div class="client-section">
        <div class="section-title">Información del Cliente</div>
        <div class="client-grid">
          <div>
            <div class="client-item">
              <span class="client-label">Cliente:</span>
              <span class="client-value">${budget.clients?.name || "N/A"}</span>
            </div>
            <div class="client-item">
              <span class="client-label">RNC:</span>
              <span class="client-value">${budget.clients?.rnc || "No disponible"}</span>
            </div>
            <div class="client-item">
              <span class="client-label">Email:</span>
              <span class="client-value">${budget.clients?.email || "N/A"}</span>
            </div>
            <div class="client-item">
              <span class="client-label">Teléfono:</span>
              <span class="client-value">${budget.clients?.phone || "N/A"}</span>
            </div>
          </div>
          <div>
            ${
              budget.clients?.address
                ? `
            <div class="client-item">
              <span class="client-label">Dirección:</span>
              <span class="client-value">${budget.clients.address}</span>
            </div>
            `
                : ""
            }
            ${
              budget.projects?.name
                ? `
            <div class="client-item">
              <span class="client-label">Proyecto:</span>
              <span class="client-value">${budget.projects.name}</span>
            </div>
            `
                : ""
            }
          </div>
        </div>
      </div>

      <div class="items-section">
        <div class="section-title">Detalles del Presupuesto</div>
        <div class="items-table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 45%;">DESCRIPCIÓN</th>
                <th style="width: 12%;" class="text-center">CANTIDAD</th>
                <th style="width: 13%;" class="text-center">UNIDAD</th>
                <th style="width: 15%;" class="text-right">PRECIO UNIT.</th>
                <th style="width: 15%;" class="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${
                budget.budget_items && budget.budget_items.length > 0
                  ? budget.budget_items
                      .map((item: any) => {
                        const itemName = item.products?.name || item.services?.name || "Elemento personalizado"
                        const itemDescription =
                          item.description || item.custom_description || item.item_description || ""
                        const itemUnit = item.products?.unit || item.services?.unit || item.unit || "unidad"

                        return `
    <tr>
      <td>
        <div class="item-name">${itemName}</div>
        ${itemDescription && itemDescription.trim() ? `<div class="item-description">${itemDescription}</div>` : ""}
      </td>
      <td class="text-center">${item.quantity || 0}</td>
      <td class="text-center">${itemUnit}</td>
      <td class="text-right">${formatCurrency(item.unit_price || 0)}</td>
      <td class="text-right"><strong>${formatCurrency(item.total || 0)}</strong></td>
    </tr>
  `
                      })
                      .join("")
                  : `
              <tr>
                <td colspan="5" class="text-center" style="padding: 20px; color: #718096;">
                  No hay elementos en este presupuesto
                </td>
              </tr>
              `
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="totals-section">
        <table class="totals-table">
          <tr class="subtotal-row">
            <td><strong>Subtotal:</strong></td>
            <td class="text-right"><strong>${formatCurrency(budget.subtotal || 0)}</strong></td>
          </tr>
          ${
            budget.itbis_amount && budget.itbis_amount > 0
              ? `
          <tr class="tax-row">
            <td><strong>ITBIS (${budget.itbis_rate || 18}%):</strong></td>
            <td class="text-right"><strong>${formatCurrency(budget.itbis_amount)}</strong></td>
          </tr>
          `
              : ""
          }
          <tr class="total-row">
            <td><strong>TOTAL:</strong></td>
            <td class="text-right"><strong>${formatCurrency(budget.total || 0)}</strong></td>
          </tr>
        </table>
      </div>

      ${
        budget.notes || budget.terms_conditions
          ? `
      <div class="notes-section">
        ${
          budget.notes
            ? `
        <div class="section-title">Notas</div>
        <div class="notes-content">${budget.notes}</div>
        `
            : ""
        }
        
        ${
          budget.terms_conditions
            ? `
        <div class="section-title" style="margin-top: 10px;">Términos y Condiciones</div>
        <div class="notes-content">${budget.terms_conditions}</div>
        `
            : ""
        }
      </div>
      `
          : ""
      }

      <div class="footer">
        <p><strong>Presupuesto generado el ${formatDate(new Date().toISOString())}</strong></p>
        <p>Este presupuesto es válido por 30 días a partir de la fecha de emisión, salvo que se especifique lo contrario.</p>
        ${settings?.company_name ? `<p>© ${new Date().getFullYear()} ${settings.company_name}. Todos los derechos reservados.</p>` : ""}
      </div>
    </body>
    </html>
  `
  }

  const handleViewPDF = () => {
    setIsGenerating(true)
    try {
      const html = generateHTML()
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, "_blank", "width=1200,height=800,scrollbars=yes,resizable=yes")

      if (!newWindow) {
        const link = document.createElement("a")
        link.href = url
        link.target = "_blank"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error al generar el PDF. Por favor, intenta nuevamente.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = () => {
    setIsGenerating(true)
    try {
      const html = generateHTML()
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `presupuesto-${budget.budget_number || budget.id.slice(0, 8)}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("Error al descargar el PDF. Por favor, intenta nuevamente.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewPDF}
        disabled={isGenerating}
        className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-all duration-200 bg-transparent"
        title="Ver PDF"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPDF}
        disabled={isGenerating}
        className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all duration-200 bg-transparent"
        title="Descargar PDF"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </Button>
    </div>
  )
}
