import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCompanyAndProfile, getCompanyOwnerUserId } from "@/lib/optimized-queries"
import { generateInvoiceHTML } from "@/lib/invoice-pdf-html"
import type { Database } from "@/types/database"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuración del servidor: falta SUPABASE_SERVICE_ROLE_KEY. Sin ella la API no puede leer facturas." },
        { status: 500 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const invoiceId = resolvedParams?.id
    if (!invoiceId) {
      return NextResponse.json({ error: "ID de factura no válido" }, { status: 400 })
    }

    // 1. Factura base: select * para no depender de nombres de columnas (issue_date vs invoice_date, etc.)
    const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single()

    if (invoiceError) {
      console.error("[invoice-pdf] Error fetching invoice:", invoiceError.code, invoiceError.message)
      return NextResponse.json(
        { error: "Factura no encontrada", detail: invoiceError.message },
        { status: 404 }
      )
    }
    if (!invoiceRow) {
      return NextResponse.json(
        { error: "Factura no encontrada", detail: "No existe una factura con ese ID." },
        { status: 404 }
      )
    }

    const row = invoiceRow as Record<string, unknown>
    const clientId = row.client_id as string | null
    const projectId = row.project_id as string | null

    // 2. Cliente y proyecto por ID (evita fallos por nombre de relación)
    const [clientRes, projectRes, itemsRes] = await Promise.all([
      clientId
        ? supabaseAdmin.from("clients").select("name, email, phone, address, rnc").eq("id", clientId).single()
        : Promise.resolve({ data: null }),
      projectId
        ? supabaseAdmin.from("projects").select("name").eq("id", projectId).single()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("invoice_items").select("id, description, quantity, unit_price, total, unit, itbis_rate, itbis_amount, product_id, service_id").eq("invoice_id", invoiceId),
    ])

    const client = clientRes.data
    const project = projectRes.data
    let items = (itemsRes.data || []) as any[]

    if (items.length > 0) {
      const productIds = [...new Set(items.map((i: any) => i.product_id).filter(Boolean))]
      const serviceIds = [...new Set(items.map((i: any) => i.service_id).filter(Boolean))]
      const [productsRes, servicesRes] = await Promise.all([
        productIds.length ? supabaseAdmin.from("products").select("id, name, unit").in("id", productIds) : Promise.resolve({ data: [] }),
        serviceIds.length ? supabaseAdmin.from("services").select("id, name, unit").in("id", serviceIds) : Promise.resolve({ data: [] }),
      ])
      const productsMap = new Map((productsRes.data || []).map((p: any) => [p.id, p]))
      const servicesMap = new Map((servicesRes.data || []).map((s: any) => [s.id, s]))
      items = items.map((item: any) => ({
        ...item,
        products: item.product_id ? productsMap.get(item.product_id) : null,
        services: item.service_id ? servicesMap.get(item.service_id) : null,
      }))
    }

    const invoice = {
      ...invoiceRow,
      invoice_date: row.invoice_date ?? row.issue_date,
      clients: client,
      projects: project,
      invoice_items: items,
    }

    const ownerId = await getCompanyOwnerUserId((invoice as any).user_id)
    const { companySettings, profile, currencySymbol } = await getCompanyAndProfile(ownerId)

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
