'use server'

import { supabase } from '@/lib/supabase'

// Define types for the action
interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
    is_returnable: boolean
}

interface ReturnItem {
    id: string
    name: string
    quantity: number
}

interface ProcessSaleInput {
    clientId: string | null
    clientName: string
    dispatchId: string
    cart: CartItem[]
    returns: ReturnItem[]
    paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
    totalAmount: number
}

export async function processMobileSale(input: ProcessSaleInput) {

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('No autorizado')

        // Obtener el parent_user_id si es un empleado (para insertar datos bajo el owner)
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('parent_user_id, user_type')
            .eq('user_id', user.id)
            .single()

        // Si es empleado, usar el parent_user_id, sino usar su propio ID
        const ownerUserId = userProfile?.parent_user_id || user.id
        console.log('📝 processMobileSale - User:', user.id, 'Owner:', ownerUserId, 'Type:', userProfile?.user_type)

        // 1. Generate Receipt Number
        const receiptNumber = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`

        // 2. Create the Thermal Receipt (usando el owner_user_id)
        const { data: receiptData, error: receiptError } = await supabase
            .from('thermal_receipts')
            .insert({
                user_id: ownerUserId,
                client_id: input.clientId,
                client_name: input.clientId ? null : input.clientName,
                receipt_number: receiptNumber,
                subtotal: input.totalAmount,
                total_amount: input.totalAmount,
                payment_method: input.paymentMethod,
                dispatch_id: input.dispatchId,
                verification_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                created_by: user.id // Registrar quién lo creó (el empleado)
            })
            .select()
            .single()

        const receipt = receiptData as any

        if (receiptError) throw receiptError

        // 3. Insert Thermal Receipt Items
        let itemsToInsert: any[] = []
        if (input.cart.length > 0) {
            itemsToInsert = input.cart.filter(item => item.quantity > 0).map(item => ({
                thermal_receipt_id: receipt.id,
                product_id: item.id,
                item_name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                line_total: item.price * item.quantity
            }))

            const { error: itemsError } = await supabase
                .from('thermal_receipt_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError
        }

        // 4. Handle Returnables
        if (input.returns.length > 0) {
            const returnsToInsert = input.returns.filter(ret => ret.quantity > 0).map(ret => ({
                receipt_id: receipt.id,
                product_id: ret.id,
                quantity: ret.quantity,
                notes: 'Recibido en ruta'
            }))

            if (returnsToInsert.length > 0) {
                const { error: returnsError } = await supabase
                    .from('returned_items')
                    .insert(returnsToInsert)

                if (returnsError) throw returnsError
            }
        }

        // 5. Handle Credit (Create AR Invoice)
        if (input.paymentMethod === 'credit' && input.clientId) {
            const invoiceNumber = `INV-CR-${Date.now().toString().slice(-6)}`

            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    user_id: ownerUserId, // Usar el owner, no el empleado
                    client_id: input.clientId,
                    invoice_number: invoiceNumber,
                    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days default
                    status: 'pending',
                    subtotal: input.totalAmount,
                    total_amount: input.totalAmount, // Assuming no tax for simplicity in mobile pos for now
                    notes: `Generado por Venta en Ruta #${receiptNumber}`
                })
                .select()
                .single()

            const invoice = invoiceData as any

            if (invoiceError) throw invoiceError

            // We could insert invoice items here similarly
        }

        // 6. Mark Client as Visited in Route
        if (input.dispatchId && input.clientId) {
            await supabase
                .from('dispatch_items')
                .update({ is_visited: true, visited_at: new Date().toISOString() })
                .match({ dispatch_id: input.dispatchId, client_id: input.clientId })
        }

        // Since Supabase RPC for full transaction on inventory reduction is missing here,
        // we would ideally call an RPC to safely decrement inventory.
        // Given current limitations, we assume a trigger exists or we do it sequentially:
        // This is a simplified approach, a true implementation would use a Postgres function.

        const receiptDataToPrint = {
            id: receipt.id,
            receipt_number: receipt.receipt_number,
            client_name: receipt.client_name || 'Cliente General',
            subtotal: receipt.subtotal || 0,
            tax_amount: receipt.tax_amount || 0,
            total_amount: receipt.total_amount || 0,
            payment_method: receipt.payment_method,
            amount_received: receipt.amount_received || receipt.total_amount || 0,
            change_amount: receipt.change_amount || 0,
            qr_code: receipt.qr_code || '',
            verification_code: receipt.verification_code,
            notes: receipt.notes,
            created_at: receipt.created_at,
            items: itemsToInsert.length > 0 ? itemsToInsert : []
        }

        return { success: true, receiptNumber: receipt.receipt_number, fullReceipt: receiptDataToPrint }

    } catch (error: any) {
        console.error('Process Sale Error:', error)
        return { success: false, error: error.message }
    }
}
