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
    const reportType = searchParams.get('type') || 'summary'
    const warehouseId = searchParams.get('warehouse_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    switch (reportType) {
      case 'summary':
        return await getInventorySummary(userId, warehouseId)
      case 'valuation':
        return await getInventoryValuation(userId, warehouseId)
      case 'movements':
        return await getMovementsReport(userId, warehouseId, startDate, endDate)
      case 'low-stock':
        return await getLowStockReport(userId, warehouseId)
      case 'abc-analysis':
        return await getABCAnalysis(userId, warehouseId, startDate, endDate)
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Error generating inventory report:', error)
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    )
  }
}

async function getInventorySummary(userId: string, _warehouseId?: string | null) {
  if (!supabaseAdmin) {
    throw new Error("Database not configured")
  }

  // Get user's products - optimized with specific fields only
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, unit, current_stock, reorder_point, cost_price, unit_price')
    .eq('user_id', userId)
    .eq('is_trackable', true)

  if (productsError) {
    throw productsError
  }

  if (!products || products.length === 0) {
    return NextResponse.json({
      summary: {
        total_products: 0,
        total_stock_value: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        total_items_in_stock: 0
      },
      top_products: [],
      recent_movements: []
    })
  }

  // Calculate summary metrics
  const totalProducts = products.length
  const totalStockValue = products.reduce((sum, p) =>
    sum + ((p.current_stock || 0) * (p.cost_price || 0)), 0)
  const lowStockItems = products.filter(p =>
    p.reorder_point && (p.current_stock || 0) <= p.reorder_point).length
  const outOfStockItems = products.filter(p => (p.current_stock || 0) === 0).length
  const totalItemsInStock = products.reduce((sum, p) => sum + (p.current_stock || 0), 0)

  // Get top products by stock value
  const topProducts = products
    .map(p => ({
      ...p,
      stock_value: (p.current_stock || 0) * (p.cost_price || 0)
    }))
    .sort((a, b) => b.stock_value - a.stock_value)
    .slice(0, 10)

  // Get recent movements
  const { data: recentMovements } = await supabaseAdmin
    .from('stock_movements')
    .select(`
      *,
      product:products(name),
      warehouse:warehouses(name)
    `)
    .eq('user_id', userId)
    .order('movement_date', { ascending: false })
    .limit(10)

  return NextResponse.json({
    summary: {
      total_products: totalProducts,
      total_stock_value: totalStockValue,
      low_stock_items: lowStockItems,
      out_of_stock_items: outOfStockItems,
      total_items_in_stock: totalItemsInStock
    },
    top_products: topProducts,
    recent_movements: recentMovements || []
  })
}

async function getInventoryValuation(userId: string, warehouseId?: string | null) {
  if (!supabaseAdmin) {
    throw new Error("Database not configured")
  }

  // Optimized query - use inner join to filter directly, eliminating separate query
  let query = supabaseAdmin
    .from('product_warehouse_stock')
    .select(`
      id,
      product_id,
      warehouse_id,
      current_stock,
      available_stock,
      product:products!inner(
        id, 
        name, 
        unit, 
        cost_price, 
        unit_price,
        category,
        user_id
      ),
      warehouse:warehouses(id, name)
    `)
    .eq('product.user_id', userId)

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId)
  }

  const { data: stockData, error } = await query

  if (error) {
    throw error
  }

  const valuation = stockData?.map(item => {
    const product = item.product as any
    return {
      ...item,
      cost_value: (item.current_stock || 0) * (product?.cost_price || 0),
      retail_value: (item.current_stock || 0) * (product?.unit_price || 0),
      potential_profit: ((product?.unit_price || 0) - (product?.cost_price || 0)) * (item.current_stock || 0)
    }
  }) || []

  return NextResponse.json({ valuation })
}

async function getMovementsReport(userId: string, warehouseId?: string | null, startDate?: string | null, endDate?: string | null) {
  if (!supabaseAdmin) {
    throw new Error("Database not configured")
  }

  let query = supabaseAdmin
    .from('stock_movements')
    .select(`
      *,
      product:products(name, unit),
      warehouse:warehouses(name)
    `)
    .eq('user_id', userId)
    .order('movement_date', { ascending: false })

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId)
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

  // Group movements by type
  const movementsSummary = movements?.reduce((acc, movement) => {
    const type = movement.movement_type
    if (!acc[type]) {
      acc[type] = { count: 0, total_quantity: 0, total_value: 0 }
    }
    acc[type].count += 1
    acc[type].total_quantity += Math.abs(movement.quantity_change)
    acc[type].total_value += movement.total_cost || 0
    return acc
  }, {} as any) || {}

  return NextResponse.json({
    movements: movements || [],
    summary: movementsSummary
  })
}

async function getLowStockReport(userId: string, warehouseId?: string | null) {
  if (!supabaseAdmin) {
    throw new Error("Database not configured")
  }

  let query = supabaseAdmin
    .from('product_warehouse_stock')
    .select(`
      *,
      product:products(
        id, 
        name, 
        unit, 
        reorder_point, 
        max_stock,
        cost_price,
        unit_price,
        user_id
      ),
      warehouse:warehouses(id, name)
    `)

  // Filter by user's products
  const { data: userProducts } = await supabaseAdmin
    .from('products')
    .select('id, reorder_point')
    .eq('user_id', userId)
    .not('reorder_point', 'is', null)
    .gt('reorder_point', 0)

  if (!userProducts || userProducts.length === 0) {
    return NextResponse.json({ low_stock_items: [] })
  }

  const productIds = userProducts.map(p => p.id)
  query = query.in('product_id', productIds)

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId)
  }

  const { data: stockData, error } = await query

  if (error) {
    throw error
  }

  const lowStockItems = stockData?.filter(item =>
    item.product?.reorder_point &&
    (item.current_stock || 0) <= item.product.reorder_point
  ).map(item => ({
    ...item,
    shortage: (item.product?.reorder_point || 0) - (item.current_stock || 0),
    recommended_order: item.product?.max_stock ?
      (item.product.max_stock - (item.current_stock || 0)) :
      (item.product?.reorder_point || 0) * 2
  })) || []

  return NextResponse.json({ low_stock_items: lowStockItems })
}

async function getABCAnalysis(userId: string, warehouseId?: string | null, startDate?: string | null, endDate?: string | null) {
  if (!supabaseAdmin) {
    throw new Error("Database not configured")
  }

  // This is a simplified ABC analysis based on stock movements value
  let movementsQuery = supabaseAdmin
    .from('stock_movements')
    .select(`
      product_id,
      quantity_change,
      total_cost,
      product:products(name, unit, user_id)
    `)
    .eq('user_id', userId)

  if (warehouseId) {
    movementsQuery = movementsQuery.eq('warehouse_id', warehouseId)
  }

  if (startDate) {
    movementsQuery = movementsQuery.gte('movement_date', startDate)
  }

  if (endDate) {
    movementsQuery = movementsQuery.lte('movement_date', endDate)
  }

  const { data: movements, error } = await movementsQuery

  if (error) {
    throw error
  }

  // Group by product and calculate total value
  const productValues = movements?.reduce((acc, movement) => {
    const productId = movement.product_id
    if (!acc[productId]) {
      acc[productId] = {
        product_id: productId,
        product_name: movement.product?.[0]?.name || 'Unknown',
        total_value: 0,
        total_quantity: 0
      }
    }
    acc[productId].total_value += Math.abs(movement.total_cost || 0)
    acc[productId].total_quantity += Math.abs(movement.quantity_change || 0)
    return acc
  }, {} as any) || {}

  const sortedProducts = Object.values(productValues)
    .sort((a: any, b: any) => b.total_value - a.total_value)

  const totalValue = sortedProducts.reduce((sum: number, product: any) => sum + product.total_value, 0)

  // Classify products into A, B, C categories
  let cumulativeValue = 0
  const classifiedProducts = sortedProducts.map((product: any) => {
    cumulativeValue += product.total_value
    const cumulativePercentage = (cumulativeValue / totalValue) * 100

    let category = 'C'
    if (cumulativePercentage <= 80) {
      category = 'A'
    } else if (cumulativePercentage <= 95) {
      category = 'B'
    }

    return {
      ...product,
      percentage_of_value: (product.total_value / totalValue) * 100,
      cumulative_percentage: cumulativePercentage,
      category
    }
  })

  return NextResponse.json({ abc_analysis: classifiedProducts })
}