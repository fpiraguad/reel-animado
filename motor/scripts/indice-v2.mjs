#!/usr/bin/env node
// Arma src/v2/<NNN>/index.tsx (composiciones Reel<NNN>v2 y Reel<NNN>v2Portada) a partir del brief.
//   node scripts/indice-v2.mjs 001
// Lee las escenas («### S1 · … — t0 0,00 · t1 7,00 … `S1Gancho.tsx`»), el id del guion por el
// prefijo NNN, y la música de src/v2/sonido.ts (MUSICA[NNN]). Las opciones de estilo (fondo
// propio, subtítulos oscuros…) se leen de src/v2/<NNN>/estilo.json si existe.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nnn = process.argv[2]
if (!/^\d{3}$/.test(nnn ?? '')) throw new Error('uso: node scripts/indice-v2.mjs NNN')
const dir = path.join(RAIZ, 'src/v2', nnn)
const brief = fs.readFileSync(path.join(dir, 'BRIEF.md'), 'utf8')
const id = fs.readdirSync(path.join(RAIZ, 'guiones')).find((f) => f.startsWith(nnn + '-') && f.endsWith('.json'))?.replace(/\.json$/, '')
if (!id) throw new Error(`No hay guion ${nnn}-*.json`)

const num = (s) => Number(s.replace(',', '.'))
const escenas = []
const archivosDir = fs.readdirSync(dir).filter((f) => /^S\d+[A-Za-zÁ-úñÑ]\w*\.tsx$/.test(f))
for (const l of brief.split('\n')) {
  const m = l.match(/^###\s+(S\d+)\b.*?t0\s+([\d,\.]+)\s*·\s*t1\s+([\d,\.]+)(?:.*?`(S\d+\w*)\.tsx`)?/)
  if (!m) continue
  // si el título no trae el archivo, se busca en la carpeta el que empieza con ese S<N>
  const archivo = m[4] ?? archivosDir.find((f) => new RegExp(`^${m[1]}[A-Za-zÁ-úñÑ]`).test(f))?.replace(/\.tsx$/, '') ?? `${m[1]}?`
  escenas.push({ id: m[1], t0: num(m[2]), t1: num(m[3]), archivo })
}
if (!escenas.length) throw new Error('No encontré escenas en el brief')
const faltan = escenas.filter((e) => !fs.existsSync(path.join(dir, e.archivo + '.tsx')))
if (faltan.length) throw new Error('Faltan escenas: ' + faltan.map((e) => e.archivo).join(', '))

// nombre exportado del componente y de los SFX en cada archivo
for (const e of escenas) {
  const src = fs.readFileSync(path.join(dir, e.archivo + '.tsx'), 'utf8')
  // primero el que se llama como el archivo (S1Gancho.tsx → S1Gancho); un archivo puede exportar
  // piezas internas que también empiezan por S<N> (S1Contenido) y esas no son la escena
  const exacto = new RegExp(`export const (${e.archivo})\\s*:\\s*React\\.FC<\\{\\s*portada`).test(src) ? e.archivo : null
  e.comp = exacto
    ?? src.match(new RegExp(`export const (${e.id}\\w*)\\s*:\\s*React\\.FC<\\{\\s*portada`))?.[1]
    ?? src.match(new RegExp(`export const (${e.id}\\w*)\\s*:\\s*React\\.FC`))?.[1]
    ?? src.match(/export const (S\d+\w*)\s*[:=]/)?.[1]
  e.sfx = src.match(new RegExp(`export const (SFX_${e.id})\\b`))?.[1]
  if (!e.comp) throw new Error(`No encontré el componente exportado en ${e.archivo}.tsx`)
}

const estiloPath = path.join(dir, 'estilo.json')
const estilo = fs.existsSync(estiloPath) ? JSON.parse(fs.readFileSync(estiloPath, 'utf8')) : {}
const fin = escenas[escenas.length - 1].t1
const R = `Reel${nnn}v2`

const out = `// GENERADO por scripts/indice-v2.mjs ${nnn} — no editar a mano (cambia el brief o estilo.json).
import React from 'react'
import { Composition, registerRoot } from 'remotion'
import narracion from '../../../public/voz/${id}/narracion.json'
import { ReelV2, ConfigReel, duracionReel, Palabra } from '../Ensamble'
import { MUSICA } from '../sonido'
${escenas.map((e) => `import { ${e.comp}${e.sfx ? ', ' + e.sfx : ''} } from './${e.archivo}'`).join('\n')}
${estilo.importar ?? ''}

export const config: ConfigReel = {
  id: '${id}',
  voz: 'voz/${id}/narracion.mp3',
  palabras: (narracion as { palabras: Palabra[] }).palabras,
  fin: ${fin},
  musica: MUSICA['${nnn}'],
${estilo.config ?? ''}
  escenas: [
${escenas.map((e) => `    { id: '${e.id}', C: ${e.comp}, t0: ${e.t0}, t1: ${e.t1}, sfx: ${e.sfx ?? '[]'} },`).join('\n')}
  ],
}

const Root: React.FC = () => (
  <>
    <Composition id="${R}" component={() => <ReelV2 c={config} />} durationInFrames={duracionReel(config)} fps={30} width={1080} height={1920} />
    <Composition id="${R}Portada" component={() => <ReelV2 c={config} portada />} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
)

registerRoot(Root)
`
fs.writeFileSync(path.join(dir, 'index.tsx'), out)
console.log(`${dir}/index.tsx · ${escenas.length} escenas · fin ${fin} s · composición ${R}`)
