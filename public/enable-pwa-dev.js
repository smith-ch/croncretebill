// Script para habilitar PWA en desarrollo
// Ejecutar en DevTools Console

console.log('🚀 Habilitando PWA en desarrollo...')

// Habilitar service worker en desarrollo
localStorage.setItem('enable-sw-dev', 'true')

console.log('✅ PWA habilitado en desarrollo')
console.log('🔄 Recargando página para activar service worker...')

setTimeout(() => {
  window.location.reload()
}, 1000)