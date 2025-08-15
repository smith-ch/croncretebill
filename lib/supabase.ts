import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Client-side Supabase client (singleton pattern)
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return supabaseClient
}

// Server-side Supabase client
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

// Re-export createClient for compatibility
export { createClient }

// Types for our database
export type Profile = {
  id: string
  email: string
  full_name?: string
  role: "admin" | "vendedor" | "conductor"
  company_name?: string
  company_logo?: string
  company_address?: string
  company_phone?: string
  company_rnc?: string
  created_at: string
  updated_at: string
}

export type Client = {
  id: string
  user_id: string
  name: string
  rnc?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  user_id: string
  name: string
  description?: string
  unit_price: number
  unit: string
  category?: string
  brand?: string
  model?: string
  sku?: string
  stock_quantity?: number
  min_stock?: number
  weight?: number
  dimensions?: string
  color?: string
  material?: string
  warranty_months?: number
  // Legacy fields for backward compatibility
  mix_type?: string
  resistance?: string
  created_at: string
  updated_at: string
}

export type Service = {
  id: string
  user_id: string
  name: string
  description?: string
  price: number
  unit: string
  category?: string
  duration?: string
  requirements?: string
  includes?: string
  warranty_months?: number
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  user_id: string
  client_id: string
  project_id?: string
  invoice_number: string
  issue_date: string
  due_date?: string
  subtotal: number
  tax_amount: number
  total: number
  status: "borrador" | "enviada" | "pagada" | "cancelada"
  include_itbis?: boolean
  ncf?: string
  notes?: string
  created_at: string
  updated_at: string
}

export type DeliveryNote = {
  id: string
  user_id: string
  client_id: string
  project_id?: string
  driver_id?: string
  vehicle_id?: string
  delivery_number: string
  delivery_date: string
  departure_time?: string
  arrival_time?: string
  pump_info?: string
  plant_info?: string
  delivery_address?: string
  status: "pendiente" | "en_transito" | "entregado" | "cancelado"
  dispatcher_signature?: string
  client_signature?: string
  notes?: string
  plant_manager?: string
  resistance?: string
  slump?: string
  trip_number?: string
  direct_delivery?: boolean
  fiber?: boolean
  created_at: string
  updated_at: string
}

export type ExpenseCategory = {
  id: string
  user_id: string
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  user_id: string
  category_id?: string
  description: string
  amount: number
  expense_date: string
  notes?: string
  receipt_url?: string
  created_at: string
  updated_at: string
}

export type Budget = {
  id: string
  user_id: string
  client_id: string
  project_id?: string
  budget_number: string
  budget_date: string
  valid_until?: string
  subtotal: number
  itbis_rate: number
  itbis_amount: number
  total: number
  status: "borrador" | "enviado" | "aprobado" | "rechazado" | "vencido"
  notes?: string
  terms_conditions?: string
  created_at: string
  updated_at: string
}

export type BudgetItem = {
  id: string
  budget_id: string
  product_id: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}
