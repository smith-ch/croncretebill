// Script para limpiar el cache del service worker y localStorage
if (typeof window !== 'undefined') {
  // Limpiar localStorage problemático
  const keysToRemove = [
    'employee-view-mode',
    'was-originally-owner', 
    'role-password-verified'
  ]
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
  
  // Limpiar service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister()
      })
    })
  }
  
  // Limpiar cache
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name)
      })
    })
  }
  
  console.log('Cache y localStorage limpiados')
}