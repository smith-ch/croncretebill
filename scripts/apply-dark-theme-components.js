const fs = require('fs');
const path = require('path');

const replacements = [
  // Fondos simples
  { from: /bg-gray-50(?! rounded| text| dark)/g, to: 'bg-slate-900' },
  { from: /bg-slate-50(?! rounded| text| dark| to)/g, to: 'bg-slate-900' },
  { from: /bg-slate-100(?! text| to| dark)/g, to: 'bg-slate-800' },
  { from: /bg-gray-100(?! text| to| dark)/g, to: 'bg-slate-800' },
  
  // Hovers
  { from: /hover:bg-slate-50(?! dark)/g, to: 'hover:bg-slate-800' },
  { from: /hover:bg-gray-50(?! dark)/g, to: 'hover:bg-slate-800' },
  
  // Casos específicos con dark mode ya incluido - remover bg-slate-50
  { from: /"bg-slate-50 dark:bg-slate-800"/g, to: '"bg-slate-900 dark:bg-slate-800"' },
  { from: /hover:bg-slate-50 dark:hover:bg-slate-800/g, to: 'hover:bg-slate-800 dark:hover:bg-slate-800' },
  
  // Cards específicas
  { from: /"border-slate-800 bg-slate-50"/g, to: '"border-slate-700 bg-slate-900"' },
  
  // Textos
  { from: /text-gray-500/g, to: 'text-slate-400' },
  { from: /text-gray-700/g, to: 'text-slate-300' },
  { from: /text-gray-600/g, to: 'text-slate-400' },
  { from: /text-slate-700/g, to: 'text-slate-300' },
  
  // Borders
  { from: /border-gray-300/g, to: 'border-slate-700' },
  { from: /border-slate-300/g, to: 'border-slate-700' },
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

function walkDirectory(dir, filePattern = /\.tsx$/) {
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

// Ejecutar en el directorio components
const componentsDir = path.join(__dirname, '..', 'components');
console.log('🎨 Aplicando tema oscuro a todos los componentes...\n');
const totalModified = walkDirectory(componentsDir);
console.log(`\n✨ Proceso completado: ${totalModified} componentes modificados`);
