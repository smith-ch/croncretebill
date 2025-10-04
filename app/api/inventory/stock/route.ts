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

    let stockQuery = supabaseAdmin
      .from('product_warehouse_stock')
      .select(`
        *,
        product:products(
          id, 
          name, 
          unit, 
          unit_price, 
          cost_price, 
          current_stock,
          stock_quantity,
          reorder_point, 
          max_stock,
          category,
          barcode,
          is_trackable
        ),
        warehouse:warehouses(id, name)
      `)
      .eq('warehouse.user_id', userId)
      .order('product(name)')

    if (warehouseId) {
      stockQuery = stockQuery.eq('warehouse_id', warehouseId)
    }

    // Filter by user's products
    const { data: userProducts } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('user_id', userId)

    if (!userProducts || userProducts.length === 0) {
      return NextResponse.json({ stock: [] })
    }

    const productIds = userProducts.map(p => p.id)
    stockQuery = stockQuery.in('product_id', productIds)

    const { data: stock, error } = await stockQuery

    if (error) {
      throw error
    }

    // Calculate additional metrics
    const enrichedStock = stock?.map(item => {
      const currentStock = item.current_stock || 0
      const costPrice = item.product?.cost_price || item.product?.unit_price || 0
      const reorderPoint = item.product?.reorder_point || 0
      
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