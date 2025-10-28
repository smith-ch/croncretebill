// Emergency cleanup endpoint
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Clear-Site-Data': '"cache", "cookies", "storage", "executionContexts"',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}

export async function POST() {
  // Force clear everything
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Emergency Cleanup</title>
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
</head>
<body>
  <h1>🚨 Limpieza de Emergencia</h1>
  <div id="status">Ejecutando limpieza...</div>
  
  <script>
    (async function() {
      const status = document.getElementById('status');
      
      try {
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let reg of regs) {
            await reg.unregister();
          }
          status.innerHTML += '<br>✅ Service Workers limpiados';
        }
        
        // Clear caches
        if ('caches' in window) {
          const names = await caches.keys();
          for (let name of names) {
            await caches.delete(name);
          }
          status.innerHTML += '<br>✅ Caches limpiados';
        }
        
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('emergency-override', 'true');
        
        status.innerHTML += '<br>✅ Storage limpiado';
        status.innerHTML += '<br><br><strong>🎉 LIMPIEZA COMPLETA</strong>';
        status.innerHTML += '<br><button onclick="window.location.href=\\'/\\'" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Ir a la Aplicación</button>';
        
      } catch (error) {
        status.innerHTML += '<br>❌ Error: ' + error.message;
      }
    })();
  </script>
</body>
</html>`
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Clear-Site-Data': '"cache", "cookies", "storage", "executionContexts"'
    }
  })
}