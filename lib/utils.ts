import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número con separadores de miles (comas) y decimales (punto)
 * @param number - El número a formatear
 * @param decimals - Número de decimales (por defecto 0)
 * @returns Número formateado como 1,000.24 (comas para miles, punto para decimales)
 */
export function formatNumber(number: number, decimals: number = 0): string {
  // Validar que number sea un número válido
  if (typeof number !== 'number' || isNaN(number) || !isFinite(number)) {
    return '0'
  }

  try {
    // Usar formato estadounidense (comas para miles, punto para decimales)
    return number.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    
  } catch (error) {
    console.warn("Error formatting number:", error)
    
    // Fallback: formateo manual con comas para miles y punto para decimales
    const fixed = number.toFixed(decimals)
    const parts = fixed.split('.')
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const decimalPart = decimals > 0 ? '.' + parts[1] : ''
    
    return integerPart + decimalPart
  }
}

/**
 * Formatea un número como moneda en formato dominicano (RD$)
 * @param amount - El monto a formatear
 * @returns Monto formateado como RD$ 1,000.00
 */
export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return 'RD$ 0.00'
  }
  
  return `RD$ ${formatNumber(amount, 2)}`
}
