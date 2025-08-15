import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Server-side Supabase client with service role key
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deliveryNoteId = params.id

    // Get delivery note with related data
    const { data: deliveryNote, error: deliveryNoteError } = await supabaseAdmin
      .from("delivery_notes")
      .select(`
        *,
        clients (name, email, phone, address, rnc),
        projects (name),
        drivers (name),
        vehicles (model, plate),
        delivery_note_items (
          *,
          products (name, unit)
        )
      `)
      .eq("id", deliveryNoteId)
      .single()

    if (deliveryNoteError || !deliveryNote) {
      return NextResponse.json({ error: "Conduce no encontrado" }, { status: 404 })
    }

    // Get company settings
    const { data: companySettings } = await supabaseAdmin
      .from("company_settings")
      .select("*")
      .eq("user_id", deliveryNote.user_id)
      .single()

    // Get user profile for company info
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", deliveryNote.user_id).single()

    // Generate HTML for PDF
    const html = generateDeliveryNoteHTML(deliveryNote, profile, companySettings)

    // Return HTML response that can be converted to PDF by the client
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="conduce-${deliveryNote.delivery_number}.html"`,
      },
    })
  } catch (error) {
    console.error("Error generating delivery note PDF:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function generateDeliveryNoteHTML(deliveryNote: any, profile: any, companySettings: any) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ""
    return timeString.slice(0, 5) // Format HH:MM
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conduce ${deliveryNote.delivery_number}</title>
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
                font-size: 14px;
            }
            
            .delivery-container {
                max-width: 900px;
                margin: 0 auto;
                padding: 25px;
                background: white;
            }
            
            .delivery-form {
                border: 3px solid #000;
                width: 100%;
                border-collapse: collapse;
            }
            
            .header-row {
                height: 120px;
            }
            
            .company-section {
                width: 35%;
                border-right: 2px solid #000;
                padding: 15px;
                text-align: center;
                vertical-align: middle;
                background: #f8f9fa;
            }
            
            .company-name {
                font-size: 18px;
                font-weight: bold;
                color: #d2691e;
                margin-bottom: 10px;
            }
            
            .truck-illustration {
                width: 120px;
                height: 60px;
                margin: 10px auto;
                background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMTIwIDYwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTAgMjBIMzBWMzVIMTBWMjBaIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzk5OSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjQ1IiByPSI4IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzMzMyIvPgo8Y2lyY2xlIGN4PSI4MCIgY3k9IjQ1IiByPSI4IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzMzMyIvPgo8cGF0aCBkPSJNMzAgMjBINzBWMzVIMzBWMjBaIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzk5OSIvPgo8L3N2Zz4K') no-repeat center;
                background-size: contain;
            }
            
            .info-section {
                width: 65%;
                padding: 0;
            }
            
            .info-table {
                width: 100%;
                height: 100%;
                border-collapse: collapse;
            }
            
            .info-row {
                height: 30px;
            }
            
            .info-cell {
                border: 1px solid #000;
                padding: 8px;
                font-size: 12px;
                vertical-align: middle;
            }
            
            .label-cell {
                background: #f0f0f0;
                font-weight: bold;
                width: 25%;
            }
            
            .value-cell {
                width: 25%;
                background: white;
            }
            
            .main-row {
                height: 45px;
            }
            
            .main-cell {
                border: 2px solid #000;
                padding: 12px;
                font-size: 14px;
                vertical-align: middle;
            }
            
            .main-label {
                background: #f0f0f0;
                font-weight: bold;
                width: 20%;
            }
            
            .main-value {
                width: 30%;
                background: white;
            }
            
            .bottom-section {
                height: 180px;
            }
            
            .bottom-table {
                width: 100%;
                height: 100%;
                border-collapse: collapse;
            }
            
            .bottom-row {
                height: 45px;
            }
            
            .bottom-cell {
                border: 2px solid #000;
                padding: 12px;
                font-size: 14px;
                vertical-align: middle;
            }
            
            .bottom-label {
                background: #f0f0f0;
                font-weight: bold;
                width: 16.66%;
            }
            
            .bottom-value {
                width: 16.66%;
                background: white;
            }
            
            .checkbox {
                display: inline-block;
                width: 15px;
                height: 15px;
                border: 2px solid #000;
                margin-right: 5px;
                text-align: center;
                line-height: 11px;
                font-weight: bold;
            }
            
            .checked {
                background: #000;
                color: white;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
                
                .delivery-container {
                    padding: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="delivery-container">
            <table class="delivery-form">
                <!-- Header Row -->
                <tr class="header-row">
                    <td class="company-section">
                        <div class="company-name">HORMIGONES<br>PEÑA REYNOSO</div>
                        <div class="truck-illustration"></div>
                    </td>
                    <td class="info-section">
                        <table class="info-table">
                            <tr class="info-row">
                                <td class="info-cell label-cell">N° CONDUCE:</td>
                                <td class="info-cell value-cell">${deliveryNote.delivery_number || ""}</td>
                                <td class="info-cell label-cell">FECHA:</td>
                                <td class="info-cell value-cell">${formatDate(deliveryNote.delivery_date)}</td>
                            </tr>
                            <tr class="info-row">
                                <td class="info-cell label-cell">DESPACHADO A:</td>
                                <td class="info-cell value-cell">${deliveryNote.clients?.name || ""}</td>
                                <td class="info-cell label-cell">HORA DE SALIDA:</td>
                                <td class="info-cell value-cell">${formatTime(deliveryNote.departure_time || "")}</td>
                            </tr>
                            <tr class="info-row">
                                <td class="info-cell label-cell">DIRECCION:</td>
                                <td class="info-cell value-cell">${deliveryNote.delivery_address || deliveryNote.clients?.address || ""}</td>
                                <td class="info-cell label-cell">N° VIAJE:</td>
                                <td class="info-cell value-cell">${deliveryNote.trip_number || "1"}</td>
                            </tr>
                            <tr class="info-row">
                                <td class="info-cell label-cell">PROYECTO:</td>
                                <td class="info-cell value-cell">${deliveryNote.projects?.name || ""}</td>
                                <td class="info-cell" colspan="2"></td>
                            </tr>
                        </table>
                    </td>
                </tr>
                
                <!-- Main Info Row -->
                <tr class="main-row">
                    <td class="main-cell main-label">CONDUCTOR:</td>
                    <td class="main-cell main-value">${deliveryNote.drivers?.name || ""}</td>
                    <td class="main-cell main-label">CAMION:</td>
                    <td class="main-cell main-value">${deliveryNote.vehicles ? `${deliveryNote.vehicles.model} - ${deliveryNote.vehicles.plate}` : ""}</td>
                </tr>
                
                <!-- Bottom Section -->
                <tr class="bottom-section">
                    <td colspan="4">
                        <table class="bottom-table">
                            <tr class="bottom-row">
                                <td class="bottom-cell bottom-label">VOLUMEN:</td>
                                <td class="bottom-cell bottom-value">${deliveryNote.delivery_note_items?.[0]?.quantity || ""}</td>
                                <td class="bottom-cell bottom-label">M3 KG:</td>
                                <td class="bottom-cell bottom-value">M3</td>
                                <td class="bottom-cell bottom-label">BOMBA:</td>
                                <td class="bottom-cell bottom-value">
                                    <span class="checkbox">SI</span>
                                    <span class="checkbox">NO</span>
                                </td>
                            </tr>
                            <tr class="bottom-row">
                                <td class="bottom-cell bottom-label">ENCARGADO DE PLANTA:</td>
                                <td class="bottom-cell bottom-value" colspan="5">${deliveryNote.plant_manager || ""}</td>
                            </tr>
                            <tr class="bottom-row">
                                <td class="bottom-cell bottom-label">RESISTENCIA:</td>
                                <td class="bottom-cell bottom-value">${deliveryNote.resistance || ""}</td>
                                <td class="bottom-cell bottom-label">KG/CM2:</td>
                                <td class="bottom-cell bottom-value">KG/CM2</td>
                                <td class="bottom-cell bottom-label">DIRECTO:</td>
                                <td class="bottom-cell bottom-value">
                                    <span class="checkbox ${deliveryNote.direct_delivery ? "checked" : ""}">✓</span>
                                </td>
                            </tr>
                            <tr class="bottom-row">
                                <td class="bottom-cell bottom-label">RECIBIDO CONFORME:</td>
                                <td class="bottom-cell bottom-value" colspan="5"></td>
                            </tr>
                            <tr class="bottom-row">
                                <td class="bottom-cell bottom-label">REVENIMIENTO:</td>
                                <td class="bottom-cell bottom-value">${deliveryNote.slump || ""}</td>
                                <td class="bottom-cell bottom-label">PULG:</td>
                                <td class="bottom-cell bottom-value">PULG</td>
                                <td class="bottom-cell bottom-label">FIBRA:</td>
                                <td class="bottom-cell bottom-value">
                                    <span class="checkbox ${deliveryNote.fiber ? "checked" : ""}">✓</span>
                                </td>
                            </tr>
                            <tr class="bottom-row">
                                <td class="bottom-cell bottom-label">OBSERVACIONES:</td>
                                <td class="bottom-cell bottom-value" colspan="5">${deliveryNote.notes || ""}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
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
