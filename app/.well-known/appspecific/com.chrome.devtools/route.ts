// Handle Chrome DevTools request to prevent 404 errors
export async function GET() {
  return new Response('{}', {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}