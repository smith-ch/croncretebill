# PowerShell script to apply the multiple prices migration
# Replace these values with your Supabase database credentials

Write-Host "🚀 Aplicando migración de precios múltiples..." -ForegroundColor Cyan

# Database connection parameters
$dbHost = "aws-0-us-east-1.pooler.supabase.com"
$dbPort = "6543"
$dbName = "postgres"
$dbUser = "postgres.uhladddzopyimzolwbcb"

# Prompt for password
$password = Read-Host "Ingresa la contraseña de la base de datos" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $passwordPlain

try {
    # Execute the migration
    Write-Host "📊 Ejecutando migración..." -ForegroundColor Yellow
    
    $migrationFile = "scripts\32-create-multiple-prices-system.sql"
    
    if (Test-Path $migrationFile) {
        psql -h $dbHost -p $dbPort -d $dbName -U $dbUser -f $migrationFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migración completada exitosamente!" -ForegroundColor Green
            Write-Host "🎯 El sistema de precios múltiples está listo para usar." -ForegroundColor Green
        } else {
            Write-Host "❌ Error durante la migración" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ No se encontró el archivo de migración: $migrationFile" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
} finally {
    # Clear the password from environment
    $env:PGPASSWORD = $null
}

Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")