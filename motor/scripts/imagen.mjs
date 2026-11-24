#!/usr/bin/env node
// Genera imágenes con gpt-image-2 (OpenAI) a partir de un lote JSON.
//   node scripts/imagen.mjs lote.json [--forzar]
//   lote.json = [{ "salida": "public/ia/001/x.png", "prompt": "...", "size": "1024x1024", "calidad": "medium", "fondo": "transparent" }]
// Corre hasta 4 a la vez y salta las que ya existen (salvo --forzar).
// Llave: OPENAI_API_KEY (entorno o .env de la raíz del motor). No se imprime.
import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, requerida } from './entorno.mjs'

const rutaLote = process.argv.slice(2).find((a) => a.endsWith('.json'))
if (!rutaLote) {
  console.error('uso: node scripts/imagen.mjs lote.json [--forzar]')
  process.exit(2)
}
const llave = requerida('OPENAI_API_KEY')
const lote = JSON.parse(fs.readFileSync(path.resolve(rutaLote), 'utf8'))

const una = async (it) => {
  const salida = path.resolve(RAIZ, it.salida)
  if (fs.existsSync(salida) && !process.argv.includes('--forzar')) return `${it.salida}: ya existe`
  const cuerpo = { model: 'gpt-image-2', prompt: it.prompt, size: it.size ?? '1024x1024', quality: it.calidad ?? 'medium', n: 1 }
  if (it.fondo) cuerpo.background = it.fondo
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
  const j = await r.json()
  if (!r.ok) return `${it.salida}: ERROR ${r.status} ${j.error?.message ?? ''}`
  fs.mkdirSync(path.dirname(salida), { recursive: true })
  fs.writeFileSync(salida, Buffer.from(j.data[0].b64_json, 'base64'))
  return `${it.salida}: ok`
}

const cola = [...lote]
const trabajadores = Array.from({ length: 4 }, async () => {
  while (cola.length) console.log(await una(cola.shift()))
})
await Promise.all(trabajadores)
