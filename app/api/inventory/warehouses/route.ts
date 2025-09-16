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
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get warehouses
    const { data: warehouses, error: warehousesError } = await supabaseAdmin
      .from('warehouses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name')

    if (warehousesError) {
      throw warehousesError
    }

    return NextResponse.json({ warehouses })
  } catch (error: any) {
    console.error('Error fetching warehouses:', error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch warehouses" },
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
    const { user_id, name, description, address, manager_name, phone } = body

    if (!user_id || !name) {
      return NextResponse.json(
        { error: "User ID and name are required" },
        { status: 400 }
      )
    }

    const { data: warehouse, error } = await supabaseAdmin
      .from('warehouses')
      .insert({
        user_id,
        name,
        description,
        address,
        manager_name,
        phone,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ warehouse })
  } catch (error: any) {
    console.error('Error creating warehouse:', error)
    return NextResponse.json(
      { error: error.message || "Failed to create warehouse" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { id, user_id, name, description, address, manager_name, phone, is_active } = body

    if (!id || !user_id) {
      return NextResponse.json(
        { error: "Warehouse ID and User ID are required" },
        { status: 400 }
      )
    }

    const { data: warehouse, error } = await supabaseAdmin
      .from('warehouses')
      .update({
        name,
        description,
        address,
        manager_name,
        phone,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ warehouse })
  } catch (error: any) {
    console.error('Error updating warehouse:', error)
    return NextResponse.json(
      { error: error.message || "Failed to update warehouse" },
      { status: 500 }
    )
  }
}