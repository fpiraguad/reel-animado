// Lee variables de entorno: primero process.env y, si no está, el archivo .env de la raíz del motor.
// Parseo simple, sin dependencias: líneas CLAVE=valor, comentarios con #, comillas opcionales.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let cache
function leerEnv() {
  if (cache) return cache
  cache = {}
  const f = path.join(RAIZ, '.env')
  if (!fs.existsSync(f)) return cache
  for (const linea of fs.readFileSync(f, 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const m = l.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1)
    else v = v.replace(/\s+#.*$/, '')
    cache[m[1]] = v
  }
  return cache
}

/** Valor de la variable (process.env gana sobre .env); undefined si no existe. */
export function variable(nombre) {
  const v = process.env[nombre] ?? leerEnv()[nombre]
  return v ? v : undefined
}

/** Igual que variable(), pero falla con un mensaje claro si no está. */
export function requerida(nombre, ayuda = '') {
  const v = variable(nombre)
  if (!v) throw new Error(`Falta ${nombre}: ponla en el entorno o en ${path.join(RAIZ, '.env')}${ayuda ? ` (${ayuda})` : ''}`)
  return v
}
