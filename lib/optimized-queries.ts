/**
 * Optimized database query helpers with built-in caching
 * These helpers reduce redundant database calls and improve performance
 */

import { supabaseAdmin } from './supabase'
import { serverCache, getCacheKey, CacheTTL } from './server-cache'

/**
 * Get company settings with caching (changes infrequently)
 */
export async function getCompanySettings(userId: string) {
  const cacheKey = getCacheKey('company_settings', userId)
  
  return serverCache.get(
    cacheKey,
    async () => {
      const { data, error } = await supabaseAdmin
        .from('company_settings')
        .select(`
          company_name,
          company_address,
          company_phone,
          company_email,
          company_website,
          tax_id,
          company_logo,
          currency_code,
          currency_symbol,
          business_type,
          invoice_primary_color,
          invoice_secondary_color,
          invoice_show_logo
        `)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company settings:', error)
        return null
      }

      return data
    },
    CacheTTL.MEDIUM // 15 minutes
  )
}

/**
 * Get user profile with caching
 */
export async function getUserProfile(userId: string) {
  const cacheKey = getCacheKey('profile', userId)
  
  return serverCache.get(
    cacheKey,
    async () => {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          company_name,
          phone,
          avatar_url
        `)
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    },
    CacheTTL.MEDIUM // 15 minutes
  )
}

/**
 * Get company settings and profile in one optimized call
 */
export async function getCompanyAndProfile(userId: string) {
  const cacheKey = getCacheKey('company_profile', userId)
  
  return serverCache.get(
    cacheKey,
    async () => {
      // Run both queries in parallel
      const [companySettings, profile] = await Promise.all([
        getCompanySettings(userId),
        getUserProfile(userId)
      ])

      return {
        companySettings,
        profile,
        currencySymbol: companySettings?.currency_symbol || 'RD$'
      }
    },
    CacheTTL.MEDIUM
  )
}

/**
 * Get product with stock information (with request-scoped deduplication)
 */
export async function getProductWithStock(
  requestId: string,
  productId: string
) {
  const cacheKey = `product:${productId}`
  
  return serverCache.getOrFetch(
    requestId,
    cacheKey,
    async () => {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
          id,
          name,
          unit,
          unit_price,
          cost_price,
          current_stock,
          available_stock,
          reorder_point,
          is_trackable
        `)
        .eq('id', productId)
        .single()

      if (error) {
        console.error('Error fetching product:', error)
        return null
      }

      return data
    }
  )
}

/**
 * Get multiple products in one optimized query (instead of N queries)
 */
export async function getProductsByIds(productIds: string[]) {
  if (productIds.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      id,
      name,
      unit,
      unit_price,
      cost_price,
      current_stock,
      available_stock,
      reorder_point,
      is_trackable
    `)
    .in('id', productIds)

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data || []
}

/**
 * Get warehouse stock for a product (optimized)
 */
export async function getWarehouseStockForProduct(
  productId: string,
  userId: string
) {
  const { data, error } = await supabaseAdmin
    .from('product_warehouse_stock')
    .select(`
      id,
      product_id,
      warehouse_id,
      current_stock,
      available_stock,
      location,
      warehouse:warehouses!inner (
        id,
        name,
        user_id
      )
    `)
    .eq('product_id', productId)
    .eq('warehouse.user_id', userId)
    .gt('current_stock', 0)
    .order('current_stock', { ascending: false })

  if (error) {
    console.error('Error fetching warehouse stock:', error)
    return []
  }

  return data || []
}

/**
 * Validate stock availability for multiple items
 */
export async function validateStockAvailability(
  items: Array<{ product_id: string; quantity: number }>
) {
  const productIds = items
    .filter(item => item.product_id)
    .map(item => item.product_id)

  if (productIds.length === 0) return { valid: true, errors: [] }

  // Get all products in one query
  const products = await getProductsByIds(productIds)
  const productMap = new Map(products.map(p => [p.id, p]))

  const errors = []

  for (const item of items) {
    if (!item.product_id) continue

    const product = productMap.get(item.product_id)
    if (!product) {
      errors.push({
        product_id: item.product_id,
        product_name: 'Producto desconocido',
        requested: item.quantity,
        available: 0,
        message: 'Producto no encontrado'
      })
      continue
    }

    const availableStock = product.available_stock ?? product.current_stock ?? 0

    if (availableStock < item.quantity) {
      errors.push({
        product_id: item.product_id,
        product_name: product.name,
        requested: item.quantity,
        available: availableStock,
        message: `Stock insuficiente: disponible ${availableStock}, solicitado ${item.quantity}`
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Invalidate cache when data changes
 */
export function invalidateUserCache(userId: string) {
  serverCache.invalidate(getCacheKey('company_settings', userId))
  serverCache.invalidate(getCacheKey('profile', userId))
  serverCache.invalidate(getCacheKey('company_profile', userId))
}

/**
 * Invalidate product cache
 */
export function invalidateProductCache(productId: string) {
  serverCache.invalidatePattern(`product:${productId}`)
}
