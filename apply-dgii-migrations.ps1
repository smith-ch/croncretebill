# Script PowerShell para aplicar migraciones DGII

Write-Host "Aplicando migraciones para sistema DGII..." -ForegroundColor Green

# Verificar si existe el archivo SQL
$sqlFile = ".\scripts\23-add-client-relations-and-fields.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: No se encuentra el archivo $sqlFile" -ForegroundColor Red
    exit 1
}

# Solicitar datos de conexion si no estan en variables de entorno
if (-not $env:DATABASE_URL) {
    Write-Host "Ingresa los datos de conexion a tu base de datos Supabase:" -ForegroundColor Yellow
    $DB_HOST = Read-Host "Host (ejemplo: db.abc123.supabase.co)"
    $DB_PORT = Read-Host "Puerto (5432)"
    if (-not $DB_PORT) { $DB_PORT = "5432" }
    $DB_NAME = Read-Host "Database (postgres)"
    if (-not $DB_NAME) { $DB_NAME = "postgres" }
    $DB_USER = Read-Host "Usuario"
    $DB_PASS = Read-Host "Contrasena" -AsSecureString
    $DB_PASS_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASS))
    
    $env:DATABASE_URL = "postgresql://$DB_USER`:$DB_PASS_TEXT@$DB_HOST`:$DB_PORT/$DB_NAME"
}

Write-Host "Conectando a la base de datos..." -ForegroundColor Blue

# Verificar si psql esta disponible
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "Error: psql no esta instalado. Instala PostgreSQL client primero." -ForegroundColor Red
    Write-Host "Descarga desde: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Ejecutar el script SQL
try {
    & psql $env:DATABASE_URL -f $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Migraciones aplicadas exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Cambios realizados:" -ForegroundColor Cyan
        Write-Host "   • Agregada relacion expenses -> clients" -ForegroundColor White
        Write-Host "   • Agregados campos NCF e ITBIS a expenses" -ForegroundColor White
        Write-Host "   • Agregados campos DGII a invoices" -ForegroundColor White
        Write-Host "   • Agregados campos adicionales a clients" -ForegroundColor White
        Write-Host "   • Creadas funciones de validacion RNC/NCF" -ForegroundColor White
        Write-Host "   • Creados indices para mejor rendimiento" -ForegroundColor White
        Write-Host ""
        Write-Host "Tu sistema DGII esta listo para funcionar!" -ForegroundColor Green
    } else {
        Write-Host "Error al aplicar las migraciones. Codigo de salida: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error al ejecutar psql: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Siguiente paso: Reinicia tu aplicacion para que los cambios tomen efecto." -ForegroundColor Yellow