# Script PowerShell para ejecutar el fix de emails en user_profiles
Write-Host "🔧 Ejecutando fix para usuarios en gestor de suscripciones..." -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio de scripts
Set-Location -Path "$PSScriptRoot"

# Verificar que existe Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Instala Node.js desde: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Verificar que existe el script
if (-not (Test-Path "execute-email-fix.js")) {
    Write-Host "❌ Error: No se encuentra el archivo execute-email-fix.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Ejecutando script..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar el script
node execute-email-fix.js

Write-Host ""
Write-Host "✅ Script completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Abre el gestor de suscripciones: http://localhost:3000/subscriptions" -ForegroundColor White
Write-Host "   2. Haz clic en 'Crear Nueva Suscripción'" -ForegroundColor White
Write-Host "   3. Ahora deberías ver todos los usuarios en el dropdown" -ForegroundColor White
Write-Host ""
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
