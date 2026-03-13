import { type NextRequest, NextResponse } from "next/server"
import { generateInvoiceHTML } from "@/lib/invoice-pdf-html"

/**
 * POST /api/invoices/pdf
 * Recibe factura + companySettings + profile en el body.
 * Los datos de empresa vienen de la BD (company_settings) pero los trae el cliente
 * con su sesión para evitar "fetch failed" desde el servidor.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const invoice = body?.invoice
    const companySettings = body?.companySettings ?? null
    const profile = body?.profile ?? null

    if (!invoice?.invoice_number) {
      return NextResponse.json(
        { error: "Datos de factura incompletos (invoice.invoice_number)" },
        { status: 400 }
      )
    }

    if (!companySettings && !profile) {
      return NextResponse.json(
        { error: "Faltan datos de la empresa (companySettings). Deben enviarse en el body." },
        { status: 400 }
      )
    }

    const currencySymbol = companySettings?.currency_symbol ?? "RD$"
    const html = generateInvoiceHTML(invoice, profile, companySettings, currencySymbol)

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="factura-${invoice.invoice_number}.html"`,
      },
    })
  } catch (error) {
    console.error("[POST /api/invoices/pdf]", error)
    return NextResponse.json(
      { error: "Error al generar el PDF" },
      { status: 500 }
    )
  }
}
