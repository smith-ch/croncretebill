/**
 * Script para limpiar el caché de permisos de empleados
 * 
 * INSTRUCCIONES PARA EMPLEADOS:
 * 1. Abre la consola del navegador (F12 o botón derecho > Inspeccionar)
 * 2. Ve a la pestaña "Console" (Consola)
 * 3. Copia y pega todo este código
 * 4. Presiona Enter
 * 5. Cierra sesión y vuelve a iniciar sesión
 */

console.log('🧹 Limpiando caché de permisos de empleados...')

// Limpiar todas las claves relacionadas con permisos
const keysToRemove = [
  'cached-permissions',
  'permissions-cache-time',
  'was-originally-owner',
  'employee-view-mode',
  'is-real-employee',
  'emergency-override'
]

keysToRemove.forEach(key => {
  localStorage.removeItem(key)
  console.log(`✅ Eliminado: ${key}`)
})

// Limpiar cualquier otra clave que contenga "permission" o "owner"
Object.keys(localStorage).forEach(key => {
  if (key.toLowerCase().includes('permission') || 
      key.toLowerCase().includes('owner') ||
      key.toLowerCase().includes('employee')) {
    localStorage.removeItem(key)
    console.log(`✅ Eliminado: ${key}`)
  }
})

console.log('✅ ¡Caché limpiado!')
console.log('👉 Ahora cierra sesión y vuelve a iniciar sesión')
console.log('👉 O recarga la página con CTRL+SHIFT+R (Windows) o CMD+SHIFT+R (Mac)')
