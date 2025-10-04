import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase environment variables not found. API routes may not work properly.')
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : null

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const productId = searchParams.get('product_id')
    const warehouseId = searchParams.get('warehouse_id')
    const movementType = searchParams.get('movement_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = searchParams.get('limit') || '50'
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('stock_movements')
      .select(`
        *,
        product:products(id, name, unit),
        warehouse:warehouses(id, name)
      `)
      .eq('user_id', userId)
      .order('movement_date', { ascending: false })
      .limit(parseInt(limit))

    if (productId) {
      query = query.eq('product_id', productId)
    }

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId)
    }

    if (movementType) {
      query = query.eq('movement_type', movementType)
    }

    if (startDate) {
      query = query.gte('movement_date', startDate)
    }

    if (endDate) {
      query = query.lte('movement_date', endDate)
    }

    const { data: movements, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ movements })
  } catch (error: any) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch stock movements" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      )
    }

    const body = await request.json()
    console.log('Received stock movement request:', body)
    
    const { 
      user_id, 
      product_id, 
      warehouse_id, 
      movement_type, 
      quantity_change, 
      unit_cost, 
      reference_type, 
      reference_id, 
      notes 
    } = body

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required", received: { user_id } },
        { status: 400 }
      )
    }
    
    if (!product_id) {
      return NextResponse.json(
        { error: "product_id is required", received: { product_id } },
        { status: 400 }
      )
    }
    
    if (!warehouse_id) {
      return NextResponse.json(
        { error: "warehouse_id is required", received: { warehouse_id } },
        { status: 400 }
      )
    }
    
    if (!movement_type) {
      return NextResponse.json(
        { error: "movement_type is required", received: { movement_type } },
        { status: 400 }
      )
    }
    
    if (quantity_change === undefined || quantity_change === null) {
      return NextResponse.json(
        { error: "quantity_change is required", received: { quantity_change } },
        { status: 400 }
      )
    }

    // Validate movement_type
    const validMovementTypes = ['entrada', 'salida', 'ajuste', 'transferencia', 'venta', 'devolucion']
    if (!validMovementTypes.includes(movement_type)) {
      return NextResponse.json(
        { error: "Invalid movement_type", valid_types: validMovementTypes, received: movement_type },
        { status: 400 }
      )
    }

    // Validate that user owns the product
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, user_id, current_stock, stock_quantity')
      .eq('id', product_id)
      .eq('user_id', user_id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found or not owned by user", product_id, user_id },
        { status: 400 }
      )
    }

    // Validate that user owns the warehouse
    const { data: warehouse, error: warehouseError } = await supabaseAdmin
      .from('warehouses')
      .select('id, name, user_id')
      .eq('id', warehouse_id)
      .eq('user_id', user_id)
      .single()

    if (warehouseError || !warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found or not owned by user", warehouse_id, user_id },
        { status: 400 }
      )
    }

    // Get or create current stock record
    let currentStockValue = 0
    const { data: currentStock, error: stockError } = await supabaseAdmin
      .from('product_warehouse_stock')
      .select('current_stock, available_stock')
      .eq('product_id', product_id)
      .eq('warehouse_id', warehouse_id)
      .single()

    if (stockError) {
      // If no stock record exists, create one
      if (stockError.code === 'PGRST116') {
        console.log('Creating new stock record for product:', product_id, 'warehouse:', warehouse_id)
        
        // Use the product's current stock or stock_quantity as initial value
        const initialStock = product.current_stock || product.stock_quantity || 0
        
        const { error: insertError } = await supabaseAdmin
          .from('product_warehouse_stock')
          .insert({
            product_id,
            warehouse_id,
            current_stock: initialStock,
            available_stock: initialStock,
            reserved_stock: 0
          })

        if (insertError) {
          console.error('Error creating stock record:', insertError)
          return NextResponse.json(
            { error: "Failed to create stock record", details: insertError.message },
            { status: 500 }
          )
        }
        
        currentStockValue = initialStock
      } else {
        console.error('Error fetching stock:', stockError)
        return NextResponse.json(
          { error: "Failed to fetch current stock", details: stockError.message },
          { status: 500 }
        )
      }
    } else {
      currentStockValue = currentStock.current_stock || 0
    }

    const quantityBefore = currentStockValue
    const quantityAfter = quantityBefore + quantity_change
    const totalCost = unit_cost ? Math.abs(quantity_change) * unit_cost : 0

    // Validate that we don't go below zero for outbound movements
    if (quantityAfter < 0 && ['salida', 'venta'].includes(movement_type)) {
      return NextResponse.json(
        { 
          error: "Insufficient stock for this operation",
          current_stock: quantityBefore,
          requested_change: quantity_change,
          would_result_in: quantityAfter
        },
        { status: 400 }
      )
    }

    // Create stock movement record
    console.log('Creating stock movement:', {
      user_id,
      product_id,
      warehouse_id,
      movement_type,
      quantity_before: quantityBefore,
      quantity_change,
      quantity_after: quantityAfter
    })

    const { data: movement, error: movementError } = await supabaseAdmin
      .from('stock_movements')
      .insert({
        user_id,
        product_id,
        warehouse_id,
        movement_type,
        quantity_before: quantityBefore,
        quantity_change,
        quantity_after: quantityAfter,
        unit_cost: unit_cost || 0,
        total_cost: totalCost,
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        notes: notes || null
      })
      .select()
      .single()

    if (movementError) {
      console.error('Error creating movement:', movementError)
      return NextResponse.json(
        { error: "Failed to create stock movement", details: movementError.message },
        { status: 500 }
      )
    }

    // Update product warehouse stock
    const { error: updateError } = await supabaseAdmin
      .from('product_warehouse_stock')
      .update({
        current_stock: quantityAfter,
        available_stock: quantityAfter, // Simplified for now
        last_movement_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('product_id', product_id)
      .eq('warehouse_id', warehouse_id)

    if (updateError) {
      console.error('Error updating warehouse stock:', updateError)
      return NextResponse.json(
        { error: "Failed to update warehouse stock", details: updateError.message },
        { status: 500 }
      )
    }

    // Update product total stock (sum from all warehouses)
    const { data: allWarehouseStock, error: allStockError } = await supabaseAdmin
      .from('product_warehouse_stock')
      .select('current_stock')
      .eq('product_id', product_id)

    if (allStockError) {
      console.error('Error fetching all warehouse stock:', allStockError)
      // Don't fail the operation, just log the error
    } else {
      const totalStock = allWarehouseStock?.reduce((sum, stock) => sum + (stock.current_stock || 0), 0) || 0

      const { error: productUpdateError } = await supabaseAdmin
        .from('products')
        .update({
          current_stock: totalStock,
          available_stock: totalStock, // Simplified for now
          updated_at: new Date().toISOString()
        })
        .eq('id', product_id)

      if (productUpdateError) {
        console.error('Error updating product stock:', productUpdateError)
        // Don't fail the operation, just log the error
      }
    }

    console.log('Stock movement created successfully:', movement.id)
    return NextResponse.json({ 
      movement,
      message: "Stock movement created successfully"
    })
  } catch (error: any) {
    console.error('Error in stock movement API:', error)
    return NextResponse.json(
      { error: error.message || "Failed to create stock movement" },
      { status: 500 }
    )
  }
}