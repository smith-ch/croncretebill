// ConcreteBill PWA Service Worker
const CACHE_NAME = 'concretebill-v2.0.0'
const urlsToCache = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/concretebill-icon.svg'
]

// Install event
self.addEventListener('install', (event) => {
  console.log('ConcreteBill SW: Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('ConcreteBill SW: Opened cache')
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log('ConcreteBill SW: Installed successfully')
        return self.skipWaiting()
      })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('ConcreteBill SW: Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('ConcreteBill SW: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('ConcreteBill SW: Activated successfully')
      return self.clients.claim()
    })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
      .catch(() => {
        // If both fail, return offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/offline')
        }
      })
  )
})

// Message event for updating
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('ConcreteBill SW: Skipping waiting...')
    self.skipWaiting()
  }
})

console.log('ConcreteBill Service Worker loaded')