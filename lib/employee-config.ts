/**
 * Configuración de Empleados
 * 
 * Lista simple de emails de empleados para identificación automática
 * Agrega aquí los emails de tus empleados para que automáticamente
 * entren en modo empleado sin controles de cambio.
 */

export const EMPLOYEE_EMAILS: string[] = [
  // Agrega aquí los emails de tus empleados
  // Ejemplo:
  // "empleado1@ejemplo.com",
  // "empleado2@ejemplo.com",
  // "cajero@ejemplo.com",
]

/**
 * Función para verificar si un email corresponde a un empleado
 */
export function isEmployeeEmail(email: string): boolean {
  return EMPLOYEE_EMAILS.includes(email.toLowerCase())
}

/**
 * Función para verificar si un usuario es empleado por email
 */
export function isRealEmployeeByEmail(userEmail?: string | null): boolean {
  if (!userEmail) {
    return false
  }
  return isEmployeeEmail(userEmail)
}