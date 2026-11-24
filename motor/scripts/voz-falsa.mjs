#!/usr/bin/env node
// Narración FALSA para probar el motor sin ElevenLabs: audio en silencio y tiempos de palabra
// sintéticos, con el mismo formato que deja scripts/voz.mjs.
//
//   node scripts/voz-falsa.mjs guiones/001-demo.json
//
// Reparte las palabras a ~2,6 palabras por segundo, con 0,35 s de pausa entre escenas, y deja
// public/voz/<id>/narracion.mp3 (silencio) y public/voz/<id>/narracion.json. Cuando tengas la
// llave, corre scripts/voz.mjs con el mismo guion y la voz real reemplaza a esta (la huella cambia).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { RAIZ } from './entorno.mjs'

const PALABRAS_POR_SEG = 2.6
const PAUSA_ESCENA = 0.35
const PREVIO = 0.12
const COLA_FINAL = 0.8

const sinEtiquetas = (t) => t.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()

const ruta = process.argv.slice(2).find((a) => a.endsWith('.json'))
if (!ruta) {
  console.error('uso: node scripts/voz-falsa.mjs guiones/<id>.json')
  process.exit(1)
}
const guion = JSON.parse(fs.readFileSync(path.resolve(RAIZ, ruta), 'utf8'))

const paso = 1 / PALABRAS_POR_SEG
const palabras = []
const inicios = []
let t = 0.2
guion.escenas.forEach((e, i) => {
  if (i > 0) t += PAUSA_ESCENA
  const ws = sinEtiquetas(e.voz).split(' ').filter(Boolean)
  inicios.push(i === 0 ? 0 : Math.max(0, t - PREVIO))
  for (const w of ws) {
    // las palabras largas duran un poco más; el promedio queda en ~2,6 palabras/s
    const dur = paso * Math.min(1.6, Math.max(0.6, w.length / 5.5))
    palabras.push({ texto: w, inicio: +t.toFixed(3), fin: +(t + dur * 0.85).toFixed(3) })
    t += dur
  }
})
if (!palabras.length) throw new Error('El guion no tiene palabras en escenas[].voz')

const finAudio = palabras.at(-1).fin + COLA_FINAL
const carpeta = path.join(RAIZ, 'public/voz', guion.id)
fs.mkdirSync(carpeta, { recursive: true })
const mp3 = path.join(carpeta, 'narracion.mp3')
execFileSync('nice', [
  '-n', '10', 'ffmpeg', '-v', 'error', '-y', '-threads', '2',
  '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', finAudio.toFixed(3),
  '-c:a', 'libmp3lame', '-b:a', '64k', mp3,
])
const huella = 'falsa-' + crypto.createHash('sha1').update(JSON.stringify(palabras)).digest('hex').slice(0, 10)
fs.writeFileSync(path.join(carpeta, 'narracion.json'), JSON.stringify({ huella, modelo: 'falsa', palabras }))

console.log(`${guion.id}: voz falsa, ${palabras.length} palabras, ${guion.escenas.length} escenas, ${finAudio.toFixed(1)} s`)
guion.escenas.forEach((e, i) => {
  const fin = i + 1 < inicios.length ? inicios[i + 1] : finAudio
  console.log(`  ${String(e.id ?? i + 1).padEnd(16)} t0 ${inicios[i].toFixed(2).padStart(6)} · t1 ${fin.toFixed(2).padStart(6)}`)
})
