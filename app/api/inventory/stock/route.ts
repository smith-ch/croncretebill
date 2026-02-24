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
    const warehouseId = searchParams.get('warehouse_id')

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Optimized query - use inner join to filter by user's products directly
    // This eliminates the need for a separate query to get user products
    let stockQuery = supabaseAdmin
      .from('product_warehouse_stock')
      .select(`
        id,
        product_id,
        warehouse_id,
        current_stock,
        available_stock,
        reserved_stock,
        location,
        last_count_date,
        product:products!inner(
          id, 
          name, 
          unit, 
          unit_price, 
          cost_price, 
          current_stock,
          reorder_point, 
          max_stock,
          category,
          barcode,
          is_trackable,
          user_id
        ),
        warehouse:warehouses!inner(
          id,
          name,
          user_id
        )
      `)
      .eq('product.user_id', userId)
      .eq('warehouse.user_id', userId)

    if (warehouseId) {
      stockQuery = stockQuery.eq('warehouse_id', warehouseId)
    }

    const { data: stock, error } = await stockQuery.order('product(name)')

    if (error) {
      throw error
    }

    // Calculate additional metrics
    const enrichedStock = stock?.map(item => {
      const currentStock = item.current_stock || 0
      const product = item.product as any
      const costPrice = product?.cost_price || product?.unit_price || 0
      const reorderPoint = product?.reorder_point || 0

      return {
        ...item,
        stock_value: currentStock * costPrice,
        is_low_stock: reorderPoint > 0 ? currentStock <= reorderPoint : false,
        is_out_of_stock: currentStock === 0,
        stock_status: currentStock === 0 ? 'out_of_stock' :
          (reorderPoint > 0 && currentStock <= reorderPoint) ? 'low_stock' : 'in_stock'
      }
    }) || []

    return NextResponse.json({ stock: enrichedStock })
  } catch (error: any) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory" },
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
    const { product_id, warehouse_id, current_stock, location } = body

    if (!product_id || !warehouse_id || current_stock === undefined) {
      return NextResponse.json(
        { error: "Product ID, warehouse ID, and current stock are required" },
        { status: 400 }
      )
    }

    const { data: stockRecord, error } = await supabaseAdmin
      .from('product_warehouse_stock')
      .upsert({
        product_id,
        warehouse_id,
        current_stock,
        available_stock: current_stock, // Simplified for now
        location,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_id,warehouse_id'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ stockRecord })
  } catch (error: any) {
    console.error('Error updating inventory:', error)
    return NextResponse.json(
      { error: error.message || "Failed to update inventory" },
      { status: 500 }
    )
  }
}