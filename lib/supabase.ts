import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Single client instance for all operations (singleton pattern)
let _supabaseClient: ReturnType<typeof createClient<Database>> | null = null
let _supabaseAdminClient: ReturnType<typeof createClient<Database>> | null = null

function getSupabaseInstance() {
  if (!_supabaseClient) {
    _supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return _supabaseClient
}

function getSupabaseAdminInstance() {
  if (!_supabaseAdminClient && typeof window === 'undefined') {
    if (supabaseServiceKey) {
      _supabaseAdminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    } else {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not found, using anon key for admin operations.')
      _supabaseAdminClient = getSupabaseInstance()
    }
  }
  return _supabaseAdminClient || getSupabaseInstance()
}

// Export the singleton instance
export const supabase = getSupabaseInstance()

// Export admin client (server-side only)
export const supabaseAdmin = getSupabaseAdminInstance()

// Export the main client as default
export default supabase

// Legacy exports for compatibility - all return the same singleton
export function getSupabaseClient() {
  return supabase
}

export function createServerClient() {
  return supabase
}

export function createAdminClient() {
  return getSupabaseAdminInstance()
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
