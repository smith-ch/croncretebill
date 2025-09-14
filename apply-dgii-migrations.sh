#!/bin/bash

# Script para ejecutar las migraciones de base de datos necesarias para DGII

echo "🚀 Aplicando migraciones para sistema DGII..."

# Verificar si psql está disponible
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql no está instalado. Instala PostgreSQL client primero."
    exit 1
fi

# Solicitar datos de conexión si no están en variables de entorno
if [ -z "$DATABASE_URL" ]; then
    echo "📝 Ingresa los datos de conexión a tu base de datos Supabase:"
    read -p "Host (ejemplo: db.abc123.supabase.co): " DB_HOST
    read -p "Puerto (5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    read -p "Database (postgres): " DB_NAME  
    DB_NAME=${DB_NAME:-postgres}
    read -p "Usuario: " DB_USER
    read -s -p "Contraseña: " DB_PASS
    echo ""
    
    DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
fi

echo "🔗 Conectando a la base de datos..."

# Ejecutar el script SQL
psql "$DATABASE_URL" -f "./scripts/23-add-client-relations-and-fields.sql"

if [ $? -eq 0 ]; then
    echo "✅ Migraciones aplicadas exitosamente!"
    echo ""
    echo "📋 Cambios realizados:"
    echo "   • Agregada relación expenses -> clients"
    echo "   • Agregados campos NCF e ITBIS a expenses"
    echo "   • Agregados campos DGII a invoices"
    echo "   • Agregados campos adicionales a clients"
    echo "   • Creadas funciones de validación RNC/NCF"
    echo "   • Creados índices para mejor rendimiento"
    echo ""
    echo "🎉 Tu sistema DGII está listo para funcionar!"
else
    echo "❌ Error al aplicar las migraciones. Revisa la conexión y permisos."
    exit 1
fi