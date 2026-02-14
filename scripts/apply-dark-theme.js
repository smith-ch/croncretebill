// Script para reemplazar fondos blancos con tema oscuro slate
// EXCLUYE: Componentes de PDF y archivos de impresión

const fs = require('fs');
const path = require('path');

// Archivos a excluir (PDFs y componentes de impresión)
const excludePatterns = [
  /pdf/i,
  /print/i,
  /invoice-pdf-preview/i,
  /budget-pdf-generator/i
];

// Reemplazos a realizar
const replacements = [
  // Fondos blancos a slate oscuro
  { from: /bg-white([^-/])/g, to: 'bg-slate-900$1' },
  { from: /from-white/g, to: 'from-slate-900' },
  { from: /to-white/g, to: 'to-slate-900' },
  
  // Bordes claros a oscuros
  { from: /border-slate-200/g, to: 'border-slate-800' },
  { from: /border-blue-200/g, to: 'border-slate-700' },
  { from: /border-gray-200/g, to: 'border-slate-800' },
  
  // Texto oscuro a claro
  { from: /text-gray-800/g, to: 'text-slate-200' },
  { from: /text-slate-800/g, to: 'text-slate-200' },
  { from: /text-slate-700/g, to: 'text-slate-300' },
  { from: /text-slate-600/g, to: 'text-slate-400' },
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
      // Omitir node_modules, .next, etc
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file)) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Directorios a procesar
const dirsToProcess = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components')
];

let totalProcessed = 0;
let totalModified = 0;

console.log('🎨 Aplicando tema oscuro slate...\n');

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
