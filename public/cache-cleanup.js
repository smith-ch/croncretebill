// Script para limpiar cache del navegador y service workers
// Ejecutar en DevTools Console para eliminar problemas de cache

(function cleanBrowserCache() {
  console.log('🧹 Iniciando limpieza de cache...')
  
  // 1. Limpiar localStorage relacionado con permisos
  const keysToRemove = [
    'user-permissions-cache',
    'user-permissions-cache-time',
    'emergency-override',
    'role-switch-mode'
  ]
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      console.log(`✅ Eliminado localStorage: ${key}`)
    }
  })
  
  // 2. Unregister service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister().then(() => {
          console.log('✅ Service worker unregistered:', registration.scope)
        })
      })
    })
  }
  
  // 3. Limpiar cache de la aplicación
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName).then(() => {
          console.log('✅ Cache eliminado:', cacheName)
        })
      })
    })
  }
  
  // 4. Forzar recarga sin cache
  setTimeout(() => {
    console.log('🔄 Recargando página sin cache...')
    window.location.reload()
  }, 2000)
  
  console.log('✅ Limpieza completada. La página se recargará automáticamente.')
})()