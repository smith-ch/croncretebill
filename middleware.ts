import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acceso sin autenticación a archivos PWA y estáticos
  const pwaRoutes = [
    '/manifest.json',
    '/sw.js',
    '/pwa-update.js',
    '/offline',
    '/pwa-status',
    '/icons/',
    '/favicon.ico',
    '/_next/',
    '/api/auth'
  ]

  // Si la ruta es de PWA o estática, permitir acceso directo
  if (pwaRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next()
    
    // Agregar headers específicos para PWA
    if (pathname === '/manifest.json') {
      response.headers.set('Content-Type', 'application/manifest+json')
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    }
    
    if (pathname === '/sw.js') {
      response.headers.set('Content-Type', 'application/javascript')
      response.headers.set('Service-Worker-Allowed', '/')
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
    
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}