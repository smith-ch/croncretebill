import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validateStockAvailability } from "@/lib/optimized-queries"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Invoice creation request body:', body)
    
    const {
      user_id,
      invoice_number,
      client_id,
      project_id,
      invoice_date,
      issue_date,
      due_date,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      status,
      notes,
      include_itbis,
      ncf,
      payment_method,
      items,
      cash_shift_id
    } = body

    // Validate required fields (client_id is optional)
    if (!user_id || !invoice_number || !invoice_date || !due_date || !items || items.length === 0) {
      console.log('Validation failed - missing required fields:', {
        user_id: !!user_id,
        invoice_number: !!invoice_number,
        client_id: client_id || 'null (optional)',
        invoice_date: !!invoice_date,
        due_date: !!due_date,
        items: items?.length || 0
      })
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    // Optimized stock validation - one query for all products instead of N queries
    const itemsToValidate = items
      .filter((item: any) => item.product_id && item.quantity > 0)
      .map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))

    const stockValidation = await validateStockAvailability(itemsToValidate)

    // If there are stock validation errors, return them
    if (!stockValidation.valid) {
      return NextResponse.json(
        { 
          error: "Stock insuficiente",
          details: stockValidation.errors.map(err => 
            `${err.product_name}: Solicitado ${err.requested}, Disponible ${err.available}`
          ).join('; ')
        },
        { status: 400 }
      )
    }

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        user_id,
        invoice_number,
        client_id,
        project_id: project_id && project_id !== "none" ? project_id : null,
        invoice_date,
        issue_date,
        due_date,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        status,
        notes: notes || null,
        include_itbis,
        ncf: include_itbis ? ncf : null,
        payment_method: payment_method || "credito",
        cash_shift_id: cash_shift_id || null,
      })
      .select()
      .single()

    if (invoiceError) {
      throw invoiceError
    }

    // Prepare invoice items
    const invoiceItems = items.map((item: any) => ({
      invoice_id: invoice.id,
      product_id: item.product_id || null,
      service_id: item.service_id || null,
      description: item.description || "Elemento",
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      unit: item.unit || "unidad",
      itbis_rate: include_itbis ? 18 : 0,
      itbis_amount: include_itbis ? item.quantity * item.unit_price * 0.18 : 0,
    }))

    // Insert invoice items (this will trigger the stock reduction via trigger)
    const { error: itemsError } = await supabaseAdmin
      .from("invoice_items")
      .insert(invoiceItems)

    if (itemsError) {
      // If items insertion fails, delete the invoice
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id)
      throw itemsError
    }

    // Stock movements tracking (stock reduction is handled by database trigger)
    console.log('Creating stock movements for invoice items...')
    
    // Get all products and warehouse stocks in batch to avoid N+1 queries
    const productIds = invoiceItems
      .filter((item: any) => item.product_id)
      .map((item: any) => item.product_id)
    
    if (productIds.length > 0) {
      // Batch fetch products with cost information
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, name, cost_price')
        .in('id', productIds)
      
      // Batch fetch warehouse stocks (for stock movement tracking only)
      const { data: allWarehouseStocks } = await supabaseAdmin
        .from('product_warehouse_stock')
        .select('id, product_id, current_stock, warehouse_id')
        .in('product_id', productIds)
        .gt('current_stock', 0)
      
      // Create maps for quick lookup
      const productMap = new Map(products?.map(p => [p.id, p]) || [])
      const warehouseStockMap = new Map<string, any[]>()
      allWarehouseStocks?.forEach(ws => {
        if (!warehouseStockMap.has(ws.product_id)) {
          warehouseStockMap.set(ws.product_id, [])
        }
        warehouseStockMap.get(ws.product_id)!.push(ws)
      })
    
      for (const item of invoiceItems) {
        if (item.product_id) {
          try {
            const currentProduct = productMap.get(item.product_id)
            const warehouseStocks = warehouseStockMap.get(item.product_id) || []

            if (!currentProduct) {
              console.error('Product not found:', item.product_id)
              continue
            }

            // Create stock movements for tracking (not for reducing stock - that's done by trigger)
            let remainingToTrack = item.quantity
            const stockMovements = []
            
            for (const warehouseStock of warehouseStocks) {
              if (remainingToTrack <= 0) break
              
              const currentWarehouseStock = warehouseStock.current_stock || 0
              if (currentWarehouseStock > 0) {
                const toTrack = Math.min(remainingToTrack, currentWarehouseStock)
                
                // Create stock movement record (for history/tracking only)
                stockMovements.push({
                  user_id: user_id,
                  product_id: item.product_id,
                  warehouse_id: warehouseStock.warehouse_id,
                  movement_type: 'venta',
                  quantity_before: currentWarehouseStock,
                  quantity_change: -toTrack,
                  quantity_after: currentWarehouseStock - toTrack,
                  unit_cost: currentProduct.cost_price || 0,
                  total_cost: (currentProduct.cost_price || 0) * toTrack,
                  reference_type: 'invoice',
                  reference_id: invoice.id,
                  movement_date: new Date().toISOString(),
                  notes: `Venta - Factura ${invoice.invoice_number}`
                })

                remainingToTrack -= toTrack
              }
            }
            
            // Insert stock movements for tracking
            if (stockMovements.length > 0) {
              await supabaseAdmin
                .from('stock_movements')
                .insert(stockMovements)
            }
          } catch (error) {
            console.error('Error creating stock movement:', error)
            // Don't fail the entire invoice if movement tracking fails
          }
        }
      }
    }

    // Crear cuenta por cobrar si el método de pago es crédito
    if (payment_method === 'credito' || payment_method === 'credit') {
      try {
        const dueDate = new Date(due_date)
        
        const { error: arError } = await supabaseAdmin
          .from('accounts_receivable')
          .insert({
            user_id,
            client_id: client_id || null,
            invoice_id: invoice.id,
            document_number: invoice_number,
            description: `Crédito por factura ${invoice_number}`,
            total_amount: total,
            issue_date: invoice_date,
            due_date: dueDate.toISOString().split('T')[0],
            payment_terms: Math.ceil((dueDate.getTime() - new Date(invoice_date).getTime()) / (1000 * 60 * 60 * 24)),
            status: 'pendiente'
          })

        if (arError) {
          console.warn('No se pudo crear cuenta por cobrar:', arError.message)
          // No lanzar error, solo advertir - la tabla puede no existir aún
        } else {
          console.log('Cuenta por cobrar creada para factura:', invoice_number)
        }
      } catch (arError) {
        console.warn('Error al crear cuenta por cobrar:', arError)
        // No fallar la factura por esto
      }
    }

    return NextResponse.json({ 
      success: true, 
      invoice: invoice,
      message: "Factura creada exitosamente y stock actualizado"
    })

  } catch (error: any) {
    console.error("Error creating invoice:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    
    // Provide more specific error messages
    let errorMessage = "Error interno del servidor"
    
    if (error.code === '23505') {
      errorMessage = "Ya existe una factura con este número"
    } else if (error.code === '23503') {
      errorMessage = "Referencia inválida (cliente, proyecto o producto no encontrado)"
    } else if (error.code === '42P01') {
      errorMessage = "Error de base de datos: tabla no encontrada"
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          details: error.details,
          hint: error.hint
        } : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get("user_id")

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id es requerido" },
        { status: 400 }
      )
    }

    // Optimized query - only select necessary fields instead of *
    const { data: invoices, error } = await supabaseAdmin
      .from("invoices")
      .select(`
        id,
        user_id,
        invoice_number,
        invoice_date,
        due_date,
        subtotal,
        tax_amount,
        total,
        status,
        payment_method,
        include_itbis,
        ncf,
        created_at,
        client:clients(id, name, email, phone, rnc),
        project:projects(id, name),
        invoice_items(id, quantity, unit_price, total)
      `)
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ invoices })

  } catch (error: any) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}