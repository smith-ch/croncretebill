// PWA Update Script - OPTIMIZED VERSION
// Service worker registration with smart caching and update handling

console.log('Initializing optimized PWA service worker...')

// Only register service worker in production or when explicitly enabled
const shouldRegisterSW = process.env.NODE_ENV === 'production' || 
                        localStorage.getItem('enable-sw-dev') === 'true'

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && shouldRegisterSW) {
  window.addEventListener('load', async () => {
    try {
      // Register service worker with optimized configuration
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      })
      
      console.log('✅ Service Worker registered successfully')
      
      // Handle updates gracefully
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nueva versión de ConcreteBill disponible')
              
              // Notify user about update (non-intrusive)
              window.dispatchEvent(new CustomEvent('pwa-update-available', {
                detail: { registration, newWorker }
              }))
            }
          })
        }
      })
      
      // Check for updates periodically (every 30 minutes)
      setInterval(() => {
        registration.update()
      }, 30 * 60 * 1000)
      
      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('💾 PWA cache updated')
          window.dispatchEvent(new CustomEvent('pwa-cache-updated', {
            detail: { message: 'Cache actualizado' }
          }))
        }
      })

    } catch (error) {
      console.warn('Service Worker registration failed:', error)
      // Don't break the app if SW fails
    }
  })
} else {
  console.log('Service Worker registration skipped (development mode)')
}

// Function to manually refresh caches (useful for development)
function refreshAppCache() {
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      const appCaches = cacheNames.filter(name => 
        name.includes('workbox') ||
        name.includes('static') ||
        name.includes('images') ||
        name.includes('next')
      )
      
      Promise.all(appCaches.map(cacheName => caches.delete(cacheName)))
        .then(() => {
          console.log('🧹 App caches cleared')
          window.location.reload()
        })
    })
  }
}

// Export utilities for manual control
if (typeof window !== 'undefined') {
  window.refreshAppCache = refreshAppCache
  window.enableSWDev = () => {
    localStorage.setItem('enable-sw-dev', 'true')
    window.location.reload()
  }
  window.disableSWDev = () => {
    localStorage.removeItem('enable-sw-dev')
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister())
      }).then(() => window.location.reload())
    }
  }
}