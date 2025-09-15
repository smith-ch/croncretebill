# Aplicar migración de gastos fijos
Write-Host "Aplicando migración de gastos fijos..." -ForegroundColor Green

# Verificar que el archivo de migración existe
$migrationFile = "scripts\28-create-fixed-expenses-table.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Error "El archivo de migración no existe: $migrationFile"
    exit 1
}

# Ejecutar la migración usando Supabase CLI
try {
    Write-Host "Ejecutando migración..." -ForegroundColor Yellow
    supabase db reset --local
    Write-Host "Migración aplicada exitosamente!" -ForegroundColor Green
} catch {
    Write-Error "Error aplicando migración: $_"
    exit 1
}

Write-Host "Migración completada." -ForegroundColor Green