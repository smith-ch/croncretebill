// Force PWA update script
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/sw.js')
      
      // Force update check
      registration.update()
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('Nueva versión de ConcreteBill disponible')
              
              // Dispatch custom event for update notification
              window.dispatchEvent(new CustomEvent('pwa-update-available', {
                detail: { registration, newWorker }
              }))
            }
          })
        }
      })

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('PWA cache actualizado')
          // Force reload to use new assets
          window.location.reload()
        }
      })

      // Force clear old cache and reload for logo updates
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

    } catch (error) {
      console.error('Error registering service worker:', error)
    }
  })

  // Force cache clear for logo updates
  window.addEventListener('beforeunload', () => {
    // Clear specific caches that might contain old logos
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        const logoRelatedCaches = cacheNames.filter(name => 
          name.includes('static-image-assets') || 
          name.includes('next-image') ||
          name.includes('icon')
        )
        
        logoRelatedCaches.forEach(cacheName => {
          caches.delete(cacheName)
        })
      })
    }
  })
}