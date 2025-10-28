// Route to unregister service workers
export async function GET() {
  return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>Service Worker Cleanup</title>
</head>
<body>
  <h1>Limpiando Service Workers...</h1>
  <div id="status">Iniciando limpieza...</div>
  
  <script>
    const statusDiv = document.getElementById('status');
    
    async function cleanup() {
      try {
        // Unregister all service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          statusDiv.innerHTML += '<br>Encontrados ' + registrations.length + ' service workers';
          
          for (let registration of registrations) {
            await registration.unregister();
            statusDiv.innerHTML += '<br>✓ Service worker desregistrado: ' + registration.scope;
          }
        }
        
        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          statusDiv.innerHTML += '<br>Encontrados ' + cacheNames.length + ' caches';
          
          for (let name of cacheNames) {
            await caches.delete(name);
            statusDiv.innerHTML += '<br>✓ Cache eliminado: ' + name;
          }
        }
        
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        statusDiv.innerHTML += '<br>✓ LocalStorage y SessionStorage limpiados';
        
        statusDiv.innerHTML += '<br><br><strong>✅ Limpieza completa!</strong>';
        statusDiv.innerHTML += '<br><a href="/" style="color: blue; text-decoration: underline;">Volver a la aplicación</a>';
        
      } catch (error) {
        statusDiv.innerHTML += '<br>❌ Error: ' + error.message;
      }
    }
    
    cleanup();
  </script>
</body>
</html>
  `, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}