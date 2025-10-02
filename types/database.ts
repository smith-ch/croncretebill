// Basic database types to fix TypeScript errors
// These should ideally be generated from Supabase schema

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          rnc: string
          contact_person: string
          email: string
          phone: string
          address: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          rnc: string
          contact_person: string
          email: string
          phone: string
          address: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          rnc?: string
          contact_person?: string
          email?: string
          phone?: string
          address?: string
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          unit_price: number
          cost_price: number
          unit: string
          category: string
          category_id: string | null
          brand: string
          sku: string
          stock_quantity: number
          current_stock: number
          min_stock: number
          reorder_point: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          unit_price: number
          cost_price: number
          unit: string
          category: string
          category_id?: string | null
          brand: string
          sku: string
          stock_quantity: number
          current_stock: number
          min_stock: number
          reorder_point: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          unit_price?: number
          cost_price?: number
          unit?: string
          category?: string
          category_id?: string | null
          brand?: string
          sku?: string
          stock_quantity?: number
          current_stock?: number
          min_stock?: number
          reorder_point?: number
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          price: number | null
          unit: string
          category: string | null
          category_id: string | null
          duration: string | null
          requirements: string | null
          includes: string | null
          warranty_months: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          price?: number | null
          unit?: string
          category?: string | null
          category_id?: string | null
          duration?: string | null
          requirements?: string | null
          includes?: string | null
          warranty_months?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          price?: number | null
          unit?: string
          category?: string | null
          category_id?: string | null
          duration?: string | null
          requirements?: string | null
          includes?: string | null
          warranty_months?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          description: string
          amount: number
          category: string
          expense_date: string
          receipt_number: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          amount: number
          category: string
          expense_date: string
          receipt_number: string
          notes: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description?: string
          amount?: number
          category?: string
          expense_date?: string
          receipt_number?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          color: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          company_name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          company_name: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          company_name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      product_warehouse_stock: {
        Row: {
          id: string
          product_id: string
          warehouse_id: string
          current_stock: number
          available_stock: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          warehouse_id: string
          current_stock: number
          available_stock: number
          created_at: string
          updated_at: string
        }
        Update: {
          id?: string
          product_id?: string
          warehouse_id?: string
          current_stock?: number
          available_stock?: number
          created_at?: string
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          user_id: string
          product_id: string
          warehouse_id: string
          movement_type: string
          quantity_change: number
          quantity_before: number
          quantity_after: number
          unit_cost: number
          total_cost: number
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          warehouse_id: string
          movement_type: string
          quantity_change: number
          quantity_before: number
          quantity_after: number
          unit_cost: number
          total_cost: number
          notes: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          warehouse_id?: string
          movement_type?: string
          quantity_change?: number
          quantity_before?: number
          quantity_after?: number
          unit_cost?: number
          total_cost?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          invoice_number: string
          total: number
          due_date: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invoice_number: string
          total: number
          due_date: string
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invoice_number?: string
          total?: number
          due_date?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      product_prices: {
        Row: {
          id: string
          product_id: string
          user_id: string
          price_name: string
          price: number
          min_quantity: number
          max_quantity: number | null
          is_default: boolean
          is_active: boolean
          valid_from: string | null
          valid_until: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          price_name: string
          price: number
          min_quantity?: number
          max_quantity?: number | null
          is_default?: boolean
          is_active?: boolean
          valid_from?: string | null
          valid_until?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          price_name?: string
          price?: number
          min_quantity?: number
          max_quantity?: number | null
          is_default?: boolean
          is_active?: boolean
          valid_from?: string | null
          valid_until?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          color: string
          icon: string
          type: 'product' | 'service' | 'both'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          color?: string
          icon?: string
          type?: 'product' | 'service' | 'both'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          color?: string
          icon?: string
          type?: 'product' | 'service' | 'both'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}