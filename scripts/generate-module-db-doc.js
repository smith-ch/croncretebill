const fs = require('fs')

const reportPath = 'scripts/module-db-report.json'
const outPath = 'docs/DB_MODULOS_ESTRUCTURA_ACTUAL.md'

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
const modules = report.modules

let md = ''
md += '# Inventario de Modulos, Tablas y Campos (estado actual)\n\n'
md += 'Fecha de generacion: 2026-03-13\n\n'
md += 'Fuente: introspeccion OpenAPI de Supabase (`public`) + uso real de tablas en `app/*` (`.from(...)`).\n\n'
md += '## Resumen\n\n'
md += `- Modulos con acceso a BD detectados: ${report.module_count}\n`
md += `- Tablas unicas detectadas en esos modulos: ${report.table_count}\n\n`

const moduleOrder = Object.keys(modules).sort()

for (const moduleName of moduleOrder) {
  md += `## Modulo: ${moduleName}\n\n`
  const tables = modules[moduleName]
  const tableOrder = Object.keys(tables).sort()

  for (const tableName of tableOrder) {
    const t = tables[tableName]
    md += `Tabla: ${tableName}\n`
    md += 'Campos:\n\n'

    if (!t.fields || !t.fields.length) {
      md += '- (No se pudieron obtener campos desde OpenAPI para esta tabla)\n\n'
    } else {
      for (const f of t.fields) {
        md += `- ${f.name} (${f.type}${f.required ? ', requerido' : ''})\n`
      }
      md += '\n'
    }

    md += 'Relaciones (FK):\n\n'
    if (t.foreign_keys && t.foreign_keys.length) {
      const seen = new Set()
      for (const fk of t.foreign_keys) {
        const key = `${fk.column}->${fk.ref_table}.${fk.ref_column}`
        if (seen.has(key)) continue
        seen.add(key)
        md += `- ${tableName}.${fk.column} -> ${fk.ref_table}.${fk.ref_column}\n`
      }
      md += '\n'
    } else {
      md += '- (No definidas en OpenAPI para esta tabla)\n\n'
    }
  }
}

fs.writeFileSync(outPath, md, 'utf8')
console.log(`created ${outPath}`)
