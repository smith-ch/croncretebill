// Tipos específicos para mejorar la seguridad de tipos en el proyecto

export interface InvoiceItem {
  id?: string
  product_id: string
  service_id: string
  quantity: number
  unit_price: number
  type: 'product' | 'service'
  original_description: string
  description?: string
  total?: number
}

export interface CompanySettings {
  id?: string
  user_id: string
  company_name: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_logo?: string
  currency?: string
  primary_color?: string
  secondary_color?: string
  created_at?: string
  updated_at?: string
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  company_name?: string
  phone?: string
  address?: string
  created_at?: string
  updated_at?: string
}

export interface ThermalReceiptItem {
  description: string
  quantity: number
  price: number
  total: number
}

export interface PaymentReceipt {
  id: string
  receipt_number: string
  client_name: string
  amount_paid: number
  payment_method: string
  payment_date: string
  invoice_id?: string
  notes?: string
  created_at: string
}

export interface InvoiceData {
  id: string
  invoice_number: string
  client_id: string
  due_date: string
  status: 'draft' | 'pending' | 'paid' | 'overdue'
  total: number
  subtotal: number
  tax: number
  discount?: number
  notes?: string
  created_at: string
  clients?: {
    name: string
    email?: string
    phone?: string
  }
  invoice_items?: InvoiceItem[]
}

export interface Vehicle {
  id: string
  license_plate: string
  brand: string
  model: string
  year: number
  type: string
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  client_id: string
  status: 'active' | 'completed' | 'on_hold'
  start_date: string
  end_date?: string
  budget?: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  unit: string
  stock?: number
  category?: string
  created_at: string
}

export interface Service {
  id: string
  name: string
  description?: string
  price?: number
  unit?: string
  category?: string
  created_at: string
}

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  tax_id?: string
  created_at: string
}

export interface Budget {
  id: string
  budget_number: string
  client_id: string
  project_id?: string
  title: string
  description?: string
  total: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  valid_until: string
  created_at: string
  budget_items?: BudgetItem[]
}

export interface BudgetItem {
  id: string
  budget_id: string
  type: 'product' | 'service'
  item_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  due_date: string
  frequency: 'monthly' | 'quarterly' | 'annually'
  category?: string
  is_active?: boolean
  last_payment?: string
  next_payment: string
  created_at?: string
  updated_at?: string
}