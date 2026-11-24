#!/usr/bin/env node
// Genera la narración de un guion con ElevenLabs en UNA SOLA TOMA: así la entonación fluye de
// una frase a la otra en vez de sonar a diez grabaciones pegadas. Los tiempos de cada palabra
// salen del endpoint con timestamps.
//
//   node scripts/voz.mjs guiones/001-demo.json
//   node scripts/voz.mjs guiones/001-demo.json --voz <voice_id> --modelo eleven_multilingual_v2
//   node scripts/voz.mjs guiones/001-demo.json --variante prueba   (sale como reel <id>--prueba)
//
// Llave: ELEVENLABS_API_KEY (entorno o .env de la raíz del motor).
// Voz, en este orden: --voz, guion.voz.id o ELEVENLABS_VOICE_ID. Sin ninguna, error.
// Modelo: --modelo, guion.voz.modelo o eleven_v3 por defecto.
//
// Las etiquetas de emoción en inglés ([curious], [serious], [short pause]…) solo se mandan a los
// modelos que las entienden (eleven_v3 / eleven_v4); con los demás se quitan para que no las lea.
//
// Otras opciones del guion:
//   voz.ajustes     voice_settings de ElevenLabs (v3/v4 solo aceptan stability 0, 0.5 o 1)
//   voz.idioma      language_code ISO 639-1 ('es', 'en'…) para forzar el idioma
//   voz.pronunciar  { "Escrita": "fonética" }: el guion y los subtítulos llevan la forma escrita
//                   y a ElevenLabs le llega la fonética
//
// Deja public/voz/<id>/narracion.mp3 y public/voz/<id>/narracion.json. Se cachea por huella:
// solo vuelve a llamar a ElevenLabs si cambia el texto, la voz, el modelo, los ajustes o el idioma.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { RAIZ, requerida, variable } from './entorno.mjs'

const CON_ETIQUETAS = /^eleven_v[34]/
const PREVIO = 0.12 // la escena cambia un poquito antes de que arranque su frase
const COLA_FINAL = 0.8

const sinEtiquetas = (t) => t.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()

/** Palabras habladas con sus tiempos; lo que va entre corchetes no es palabra. */
function palabrasDe(a) {
  const palabras = []
  let actual = ''
  let inicio = 0
  let fin = 0
  let dentro = false
  const cerrar = () => {
    if (actual) palabras.push({ texto: actual, inicio, fin })
    actual = ''
  }
  a.characters.forEach((ch, i) => {
    if (ch === '[') { cerrar(); dentro = true; return }
    if (ch === ']') { dentro = false; return }
    if (dentro) return
    if (ch.trim() === '') { cerrar(); return }
    if (!actual) inicio = a.character_start_times_seconds[i]
    actual += ch
    fin = a.character_end_times_seconds[i]
  })
  cerrar()
  return palabras
}

const argv = process.argv.slice(2)
const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined }
const ruta = argv.find((a) => a.endsWith('.json'))
if (!ruta) {
  console.error('uso: node scripts/voz.mjs guiones/<id>.json [--voz <voice_id>] [--modelo <model_id>] [--variante x]')
  process.exit(1)
}
const guion = JSON.parse(fs.readFileSync(path.resolve(RAIZ, ruta), 'utf8'))

const modelo = opt('modelo') || guion.voz?.modelo || 'eleven_v3'
const etiquetas = CON_ETIQUETAS.test(modelo)
// Con --modelo se ignoran los ajustes del guion (pueden no servirle al otro modelo).
const ajustes = (!opt('modelo') && guion.voz?.ajustes) ||
  (etiquetas ? { stability: 0.5 } : { stability: 0.4, similarity_boost: 0.85, style: 0.3, speed: 1.0 })
const cfg = { modelo, ajustes }

const vozId = opt('voz') || guion.voz?.id || variable('ELEVENLABS_VOICE_ID')
if (!vozId) {
  console.error('Falta la voz: pasa --voz <voice_id>, pon "voz": { "id": "…" } en el guion o define ELEVENLABS_VOICE_ID (entorno o .env).')
  process.exit(1)
}
if (opt('variante')) guion.id = `${guion.id}--${opt('variante')}`

const frases = guion.escenas.map((e) => (etiquetas ? e.voz : sinEtiquetas(e.voz)))
const texto = frases.join(' ')
const PRONUNCIAR = Object.entries(guion.voz?.pronunciar || {})
const aVoz = (t) => PRONUNCIAR.reduce((x, [e, f]) => x.split(e).join(f), t)
const aTexto = (t) => PRONUNCIAR.reduce((x, [e, f]) => x.split(f).join(e), t)
const textoVoz = aVoz(texto)
const idioma = guion.voz?.idioma

const carpeta = path.join(RAIZ, 'public/voz', guion.id)
fs.mkdirSync(carpeta, { recursive: true })
const mp3 = path.join(carpeta, 'narracion.mp3')
const meta = path.join(carpeta, 'narracion.json')
const huella = crypto.createHash('sha1').update(JSON.stringify([textoVoz, cfg, vozId, idioma ?? null])).digest('hex').slice(0, 10)

let toma = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : null
if (!toma || toma.huella !== huella || !fs.existsSync(mp3)) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${vozId}/with-timestamps?output_format=mp3_44100_192`,
    {
      method: 'POST',
      headers: { 'xi-api-key': requerida('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textoVoz, model_id: cfg.modelo, voice_settings: cfg.ajustes, ...(idioma ? { language_code: idioma } : {}) }),
    },
  )
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const r = await res.json()
  fs.writeFileSync(mp3, Buffer.from(r.audio_base64, 'base64'))
  toma = { huella, modelo: cfg.modelo, palabras: palabrasDe(r.alignment).map((w) => ({ ...w, texto: aTexto(w.texto) })) }
  fs.writeFileSync(meta, JSON.stringify(toma))
  console.log(`toma nueva (${cfg.modelo}): ${toma.palabras.at(-1).fin.toFixed(1)} s`)
} else {
  console.log(`toma en caché (${cfg.modelo}): ${toma.palabras.at(-1).fin.toFixed(1)} s`)
}

// Reparto por escenas: cuántas palabras le tocan a cada una y dónde arranca.
const cuantas = frases.map((f) => sinEtiquetas(f).split(' ').filter(Boolean).length)
const total = cuantas.reduce((a, b) => a + b, 0)
if (total !== toma.palabras.length) {
  throw new Error(`La toma tiene ${toma.palabras.length} palabras y el guion ${total}: revisar signos sueltos en la voz.`)
}
let k = 0
const tramos = cuantas.map((n) => {
  const ws = toma.palabras.slice(k, k + n)
  k += n
  return ws
})
const finAudio = toma.palabras.at(-1).fin + COLA_FINAL
const inicios = tramos.map((ws, i) => (i === 0 ? 0 : Math.max(0, ws[0].inicio - PREVIO)))
console.log(`${guion.id}: ${guion.escenas.length} escenas, ${finAudio.toFixed(1)} s`)
guion.escenas.forEach((e, i) => {
  const fin = i + 1 < inicios.length ? inicios[i + 1] : finAudio
  console.log(`  ${String(e.id ?? i + 1).padEnd(16)} t0 ${inicios[i].toFixed(2).padStart(6)} · t1 ${fin.toFixed(2).padStart(6)}  ${tramos[i].map((w) => w.texto).join(' ').slice(0, 60)}`)
})
