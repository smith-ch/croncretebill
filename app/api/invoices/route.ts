import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

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
      items
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

    // Check stock availability for all products
    const stockValidationErrors = []
    for (const item of items) {
      if (item.product_id && item.quantity > 0) {
        try {
          // Direct query instead of RPC to avoid potential function errors
          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('id, name, current_stock, available_stock')
            .eq('id', item.product_id)
            .single()

          if (productError) {
            console.error('Error fetching product:', productError)
            continue
          }

          const availableStock = product?.available_stock || product?.current_stock || 0
          
          if (availableStock < item.quantity) {
            stockValidationErrors.push({
              product_id: item.product_id,
              product_name: product?.name || 'Producto desconocido',
              requested: item.quantity,
              available: availableStock
            })
          }
        } catch (error) {
          console.error('Error in stock validation:', error)
          // Continue with other items instead of failing completely
        }
      }
    }

    // If there are stock validation errors, return them
    if (stockValidationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: "Stock insuficiente",
          details: stockValidationErrors.map(err => 
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

    // Manual stock reduction as fallback (until triggers are working)
    console.log('Manually reducing stock for invoice items...')
    for (const item of invoiceItems) {
      if (item.product_id) {
        try {
          // Get current stock from both systems
          const { data: currentProduct, error: stockError } = await supabaseAdmin
            .from('products')
            .select('current_stock, available_stock, name')
            .eq('id', item.product_id)
            .single()

          if (stockError) {
            console.error('Error fetching current stock:', stockError)
            continue
          }

          // Get warehouse stock
          const { data: warehouseStocks, error: warehouseError } = await supabaseAdmin
            .from('product_warehouse_stock')
            .select('id, current_stock, available_stock, warehouse_id')
            .eq('product_id', item.product_id)

          if (warehouseError) {
            console.error('Error fetching warehouse stock:', warehouseError)
            continue
          }

          // Calculate new stock values for products table
          const newCurrentStock = Math.max(0, (currentProduct.current_stock || 0) - item.quantity)
          const newAvailableStock = Math.max(0, (currentProduct.available_stock || currentProduct.current_stock || 0) - item.quantity)

          // Update products table stock
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update({
              current_stock: newCurrentStock,
              available_stock: newAvailableStock
            })
            .eq('id', item.product_id)

          if (updateError) {
            console.error('Error updating product stock:', updateError)
          } else {
            console.log(`Product stock reduced for ${currentProduct.name}: ${item.quantity} units (was: ${currentProduct.current_stock}, now: ${newCurrentStock})`)
          }

          // Update warehouse stock (reduce from the first warehouse with available stock)
          let remainingToReduce = item.quantity
          for (const warehouseStock of warehouseStocks || []) {
            if (remainingToReduce <= 0) {
              break;
            }
            
            const currentWarehouseStock = warehouseStock.current_stock || 0
            if (currentWarehouseStock > 0) {
              const toReduceFromWarehouse = Math.min(remainingToReduce, currentWarehouseStock)
              const newWarehouseStock = currentWarehouseStock - toReduceFromWarehouse
              const newWarehouseAvailable = Math.max(0, (warehouseStock.available_stock || currentWarehouseStock) - toReduceFromWarehouse)

              // Update warehouse stock
              const { error: warehouseUpdateError } = await supabaseAdmin
                .from('product_warehouse_stock')
                .update({
                  current_stock: newWarehouseStock,
                  available_stock: newWarehouseAvailable
                })
                .eq('id', warehouseStock.id)

              if (warehouseUpdateError) {
                console.error('Error updating warehouse stock:', warehouseUpdateError)
              } else {
                console.log(`Warehouse stock reduced: ${toReduceFromWarehouse} units (was: ${currentWarehouseStock}, now: ${newWarehouseStock})`)
                
                // Create stock movement record
                try {
                  await supabaseAdmin
                    .from('stock_movements')
                    .insert({
                      user_id: user_id,
                      product_id: item.product_id,
                      warehouse_id: warehouseStock.warehouse_id,
                      movement_type: 'venta',
                      quantity_before: currentWarehouseStock,
                      quantity_change: -toReduceFromWarehouse,
                      quantity_after: newWarehouseStock,
                      unit_cost: item.unit_price,
                      total_cost: (item.unit_price * toReduceFromWarehouse),
                      reference_type: 'invoice',
                      reference_id: invoice.id,
                      notes: `Stock reducido por factura ${invoice.invoice_number}`
                    })
                  console.log(`Stock movement created for ${currentProduct.name} in warehouse`)
                } catch (movementError) {
                  console.error('Error creating stock movement:', movementError)
                }
              }

              remainingToReduce -= toReduceFromWarehouse
            }
          }

          if (remainingToReduce > 0) {
            console.warn(`Could not reduce ${remainingToReduce} units from warehouse stock for ${currentProduct.name}`)
          }

        } catch (error) {
          console.error('Error in manual stock reduction:', error)
        }
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

    const { data: invoices, error } = await supabaseAdmin
      .from("invoices")
      .select(`
        *,
        client:clients(*),
        project:projects(*),
        invoice_items(*)
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