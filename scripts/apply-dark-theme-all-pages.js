const fs = require('fs');
const path = require('path');

const replacements = [
  // Fondos principales
  { from: /bg-gradient-to-br from-blue-50 via-white to-slate-50/g, to: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' },
  { from: /bg-gradient-to-br from-emerald-50 via-white to-slate-50/g, to: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' },
  { from: /bg-gradient-to-br from-slate-50 via-white to-blue-50/g, to: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' },
  { from: /bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100/g, to: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' },
  { from: /bg-gray-50/g, to: 'bg-slate-950' },
  { from: /min-h-screen bg-gradient-to-br from-slate-50 via-blue-50\/30 to-slate-900/g, to: 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' },
  
  // Cards con fondos claros (reemplazar solo bg-gradient-to-br o bg-gradient-to-r con colores pastel)
  { from: /bg-gradient-to-br from-blue-50 to-blue-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-emerald-50 to-emerald-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-green-50 to-green-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-red-50 to-red-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-purple-50 to-purple-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-amber-50 to-amber-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-teal-50 to-teal-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-cyan-50 to-cyan-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-orange-50 to-orange-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-pink-50 to-pink-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-indigo-50 to-indigo-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-violet-50 to-violet-100/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  
  // Cards con from-to sin 'br'
  { from: /bg-gradient-to-r from-slate-50 to-slate-100(?! rounded)/g, to: 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-r from-blue-50 to-blue-100/g, to: 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-r from-orange-50 to-red-50/g, to: 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-r from-slate-50 to-blue-50 rounded/g, to: 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 rounded' },
  { from: /bg-gradient-to-r from-purple-50 to-blue-50/g, to: 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-r from-green-50\/80 to-blue-50\/80/g, to: 'bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-slate-700' },
  { from: /bg-gradient-to-br from-amber-50 via-orange-50 to-red-50/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  { from: /bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50/g, to: 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' },
  
  // Headers y elementos especiales
  { from: /bg-gradient-to-r from-blue-50\/80 via-indigo-50\/60 to-purple-50\/80/g, to: 'bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 border-slate-700' },
  
  // Fondos simples
  { from: /bg-slate-50(?! to)/g, to: 'bg-slate-900' },
  { from: /bg-white\/50/g, to: 'bg-slate-800/50' },
  { from: /bg-gray-100/g, to: 'bg-slate-800' },
  { from: /bg-slate-100(?! text| to)/g, to: 'bg-slate-800' },
  
  // Hover backgrounds
  { from: /hover:bg-slate-50/g, to: 'hover:bg-slate-800' },
  { from: /hover:bg-slate-100/g, to: 'hover:bg-slate-800' },
  { from: /hover:bg-gray-50/g, to: 'hover:bg-slate-800' },
  { from: /hover:bg-gradient-to-br hover:from-blue-50 hover:to-slate-50/g, to: 'hover:bg-slate-800/70' },
  { from: /hover:bg-gradient-to-r hover:from-emerald-50 hover:to-slate-50/g, to: 'hover:bg-slate-800/70' },
  
  // Textos oscuros a claros
  { from: /text-gray-700/g, to: 'text-slate-300' },
  { from: /text-gray-600/g, to: 'text-slate-400' },
  { from: /text-gray-900/g, to: 'text-slate-200' },
  { from: /text-slate-700/g, to: 'text-slate-300' },
  { from: /text-slate-600/g, to: 'text-slate-400' },
  
  // Borders
  { from: /border-gray-300/g, to: 'border-slate-700' },
  { from: /border-slate-200/g, to: 'border-slate-700' },
  { from: /border-slate-300/g, to: 'border-slate-700' },
  
  // TabsList específico
  { from: /TabsList className="grid w-full grid-cols-3 bg-slate-100"/g, to: 'TabsList className="grid w-full grid-cols-3 bg-slate-900 border-slate-700"' },
  
  // Cards con rgba
  { from: /"bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200"/g, to: '"bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700"' },
  { from: /"p-6 bg-gray-50"/g, to: '"p-6 bg-slate-900 border-slate-700"' },
  { from: /"p-6 bg-gradient-to-r from-blue-50 to-blue-100"/g, to: '"p-6 bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700"' },
  { from: /"p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-800"/g, to: '"p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700"' },
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Modified: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function walkDirectory(dir, filePattern = /page\.tsx$/) {
  const files = fs.readdirSync(dir);
  let modifiedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      modifiedCount += walkDirectory(filePath, filePattern);
    } else if (filePattern.test(file)) {
      modifiedCount += processFile(filePath);
    }
  });
  
  return modifiedCount;
}

// Ejecutar en el directorio app
const appDir = path.join(__dirname, '..', 'app');
console.log('🎨 Aplicando tema oscuro a todas las páginas...\n');
const totalModified = walkDirectory(appDir);
console.log(`\n✨ Proceso completado: ${totalModified} archivos modificados`);
