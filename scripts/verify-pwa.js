#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando archivos PWA...\n');

// Verificar archivos PWA esenciales
const pwaFiles = [
  'public/manifest.json',
  'public/sw.js',
  'public/pwa-update.js',
  'public/icons/icon-192x192.png',
  'public/icons/icon-512x512.png'
];

let allFilesExist = true;

pwaFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - FALTA`);
    allFilesExist = false;
  }
});

// Verificar contenido del manifest
try {
  const manifestPath = path.join(process.cwd(), 'public/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  console.log('\n📋 Verificando manifest.json:');
  console.log(`✅ name: ${manifest.name}`);
  console.log(`✅ short_name: ${manifest.short_name}`);
  console.log(`✅ icons: ${manifest.icons.length} iconos`);
  console.log(`✅ display: ${manifest.display}`);
  console.log(`✅ start_url: ${manifest.start_url}`);
  
  // Verificar iconos requeridos
  const requiredSizes = ['192x192', '512x512'];
  const availableIcons = manifest.icons.map(icon => icon.sizes);
  
  requiredSizes.forEach(size => {
    if (availableIcons.includes(size)) {
      console.log(`✅ Icono ${size}: Disponible`);
    } else {
      console.log(`❌ Icono ${size}: FALTA`);
      allFilesExist = false;
    }
  });
  
} catch (error) {
  console.log(`❌ Error leyendo manifest.json: ${error.message}`);
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 ¡PWA está listo para desplegar!');
  console.log('📱 El usuario podrá instalar la aplicación');
} else {
  console.log('⚠️  Hay problemas con los archivos PWA');
  console.log('🔧 Revisa los archivos faltantes antes de desplegar');
}
console.log('='.repeat(50) + '\n');