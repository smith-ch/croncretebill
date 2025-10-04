import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items son requeridos" },
        { status: 400 }
      )
    }

    const stockValidation = []

    for (const item of items) {
      if (item.product_id) {
        // Get stock from the warehouse system (same as inventory UI)
        const { data: warehouseStock, error: stockError } = await supabase
          .from('product_warehouse_stock')
          .select('current_stock, available_stock')
          .eq('product_id', item.product_id)

        // Get product name separately
        const { data: product } = await supabase
          .from('products')
          .select('name')
          .eq('id', item.product_id)
          .single()

        if (stockError) {
          console.error('Error fetching warehouse stock:', stockError)
          continue
        }

        // Calculate total stock across all warehouses for this product
        const totalStock = warehouseStock?.reduce((sum, stock) => sum + (stock.current_stock || 0), 0) || 0
        const totalAvailable = warehouseStock?.reduce((sum, stock) => sum + (stock.available_stock || stock.current_stock || 0), 0) || 0
        
        const isAvailable = totalAvailable >= item.quantity
        const productName = product?.name || 'Producto desconocido'

        stockValidation.push({
          product_id: item.product_id,
          product_name: productName,
          requested_quantity: item.quantity,
          available_stock: totalAvailable,
          current_stock: totalStock,
          is_available: isAvailable,
          shortage: isAvailable ? 0 : item.quantity - totalAvailable
        })
      }
    }

    const hasStockIssues = stockValidation.some(item => !item.is_available)

    return NextResponse.json({
      valid: !hasStockIssues,
      stock_validation: stockValidation,
      message: hasStockIssues 
        ? "Algunos productos no tienen stock suficiente" 
        : "Stock suficiente para todos los productos"
    })

  } catch (error: any) {
    console.error("Error validating stock:", error)
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}