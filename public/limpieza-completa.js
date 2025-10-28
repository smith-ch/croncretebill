// SCRIPT DE LIMPIEZA COMPLETA - EJECUTAR EN DEVTOOLS CONSOLE
// Este script elimina todos los rastros de service workers y cache

console.log('🧹 INICIANDO LIMPIEZA COMPLETA...')

async function limpiezaCompleta() {
  // 1. Unregister todos los service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      console.log(`🔄 Encontrados ${registrations.length} service workers`)
      
      for (let registration of registrations) {
        await registration.unregister()
        console.log('✅ Service worker eliminado:', registration.scope)
      }
    } catch (e) {
      console.log('⚠️ Error eliminando service workers:', e)
    }
  }
  
  // 2. Limpiar TODOS los caches
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      console.log(`🗂️ Encontrados ${cacheNames.length} caches`)
      
      for (let cacheName of cacheNames) {
        await caches.delete(cacheName)
        console.log('✅ Cache eliminado:', cacheName)
      }
    } catch (e) {
      console.log('⚠️ Error eliminando caches:', e)
    }
  }
  
  // 3. Limpiar localStorage relacionado
  const keysToRemove = [
    'user-permissions-cache',
    'user-permissions-cache-time', 
    'emergency-override',
    'role-switch-mode',
    'pwa-prompt-dismissed',
    'workbox-precache'
  ]
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      console.log('✅ LocalStorage eliminado:', key)
    }
  })
  
  // 4. Limpiar sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('sw') || key.includes('cache') || key.includes('workbox')) {
      sessionStorage.removeItem(key)
      console.log('✅ SessionStorage eliminado:', key)
    }
  })
  
  // 5. Forzar reload completo
  console.log('🔄 Recargando página en 2 segundos...')
  setTimeout(() => {
    window.location.reload(true)
  }, 2000)
  
  console.log('✅ LIMPIEZA COMPLETA TERMINADA')
  console.log('La página se recargará automáticamente sin service workers')
}

// Ejecutar la limpieza
limpiezaCompleta()