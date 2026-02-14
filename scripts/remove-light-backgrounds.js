// Script para eliminar TODOS los fondos claros (50, 100, 200) y reemplazarlos con oscuros
const fs = require('fs');
const path = require('path');

// Archivos a excluir (PDFs y componentes de impresión)
const excludePatterns = [
  /pdf/i,
  /print/i,
  /invoice-pdf-preview/i,
  /budget-pdf-generator/i
];

// Reemplazos exhaustivos de fondos claros
const replacements = [
  // Fondos claros a oscuros
  { from: /bg-blue-50(?![\d])/g, to: 'bg-slate-900' },
  { from: /bg-blue-100(?![\d])/g, to: 'bg-slate-800' },
  { from: /bg-blue-200(?![\d])/g, to: 'bg-slate-800' },
  
  { from: /bg-red-50(?![\d])/g, to: 'bg-red-900\/30' },
  { from: /bg-red-100(?![\d])/g, to: 'bg-red-900\/30' },
  { from: /bg-red-200(?![\d])/g, to: 'bg-red-900\/30' },
  
  { from: /bg-green-50(?![\d])/g, to: 'bg-green-900\/30' },
  { from: /bg-green-100(?![\d])/g, to: 'bg-green-900\/30' },
  { from: /bg-green-200(?![\d])/g, to: 'bg-green-900\/30' },
  
  { from: /bg-emerald-50(?![\d])/g, to: 'bg-emerald-900\/30' },
  { from: /bg-emerald-100(?![\d])/g, to: 'bg-emerald-900\/30' },
  { from: /bg-emerald-200(?![\d])/g, to: 'bg-emerald-900\/30' },
  
  { from: /bg-amber-50(?![\d])/g, to: 'bg-amber-900\/30' },
  { from: /bg-amber-100(?![\d])/g, to: 'bg-amber-900\/30' },
  { from: /bg-amber-200(?![\d])/g, to: 'bg-amber-900\/30' },
  
  { from: /bg-purple-50(?![\d])/g, to: 'bg-purple-900\/30' },
  { from: /bg-purple-100(?![\d])/g, to: 'bg-purple-900\/30' },
  { from: /bg-purple-200(?![\d])/g, to: 'bg-purple-900\/30' },
  
  { from: /bg-orange-50(?![\d])/g, to: 'bg-orange-900\/30' },
  { from: /bg-orange-100(?![\d])/g, to: 'bg-orange-900\/30' },
  { from: /bg-orange-200(?![\d])/g, to: 'bg-orange-900\/30' },
  
  { from: /bg-pink-50(?![\d])/g, to: 'bg-pink-900\/30' },
  { from: /bg-pink-100(?![\d])/g, to: 'bg-pink-900\/30' },
  { from: /bg-pink-200(?![\d])/g, to: 'bg-pink-900\/30' },
  
  // Textos claros a oscuros
  { from: /text-blue-700(?![\d])/g, to: 'text-blue-400' },
  { from: /text-blue-800(?![\d])/g, to: 'text-blue-300' },
  
  { from: /text-red-700(?![\d])/g, to: 'text-red-400' },
  { from: /text-red-800(?![\d])/g, to: 'text-red-300' },
  
  { from: /text-green-700(?![\d])/g, to: 'text-green-400' },
  { from: /text-green-800(?![\d])/g, to: 'text-green-300' },
  
  { from: /text-emerald-700(?![\d])/g, to: 'text-emerald-400' },
  { from: /text-emerald-800(?![\d])/g, to: 'text-emerald-300' },
  
  { from: /text-amber-700(?![\d])/g, to: 'text-amber-400' },
  { from: /text-amber-800(?![\d])/g, to: 'text-amber-300' },
  
  { from: /text-purple-700(?![\d])/g, to: 'text-purple-400' },
  { from: /text-purple-800(?![\d])/g, to: 'text-purple-300' },
  
  { from: /text-orange-700(?![\d])/g, to: 'text-orange-400' },
  { from: /text-orange-800(?![\d])/g, to: 'text-orange-300' },
  
  // Bordes claros a oscuros
  { from: /border-blue-200(?![\d])/g, to: 'border-slate-700' },
  { from: /border-red-200(?![\d])/g, to: 'border-red-800' },
  { from: /border-green-200(?![\d])/g, to: 'border-green-800' },
  { from: /border-emerald-200(?![\d])/g, to: 'border-emerald-800' },
  { from: /border-amber-200(?![\d])/g, to: 'border-amber-800' },
  { from: /border-purple-200(?![\d])/g, to: 'border-purple-800' },
  { from: /border-orange-200(?![\d])/g, to: 'border-orange-800' },
  
  // Hovers claros a oscuros
  { from: /hover:bg-blue-50(?![\d])/g, to: 'hover:bg-slate-800' },
  { from: /hover:bg-blue-100(?![\d])/g, to: 'hover:bg-slate-800' },
  { from: /hover:bg-red-50(?![\d])/g, to: 'hover:bg-red-900\/30' },
  { from: /hover:bg-green-50(?![\d])/g, to: 'hover:bg-green-900\/30' },
  { from: /hover:bg-amber-50(?![\d])/g, to: 'hover:bg-amber-900\/30' },
];

function shouldExclude(filePath) {
  return excludePatterns.some(pattern => pattern.test(filePath));
}

function processFile(filePath) {
  if (shouldExclude(filePath)) {
    console.log(`⏭️  Omitiendo (PDF/Print): ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ from, to }) => {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Actualizado: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error en ${filePath}:`, error.message);
  }
  
  return false;
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file)) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const dirsToProcess = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components')
];

let totalProcessed = 0;
let totalModified = 0;

console.log('🎨 Eliminando TODOS los fondos claros...\n');

dirsToProcess.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = walkDir(dir);
    console.log(`\n📁 Procesando ${files.length} archivos en ${dir}...\n`);
    
    files.forEach(file => {
      totalProcessed++;
      if (processFile(file)) {
        totalModified++;
      }
    });
  }
});

console.log(`\n✨ Completado!`);
console.log(`📊 Archivos procesados: ${totalProcessed}`);
console.log(`✅ Archivos modificados: ${totalModified}`);
