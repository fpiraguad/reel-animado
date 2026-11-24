#!/usr/bin/env node
// Revisión rápida de una escena: empaqueta UNA vez, abre UN Chrome y saca todas las fotos (y si
// quieres la hoja de contacto y el mp4) en la misma pasada. Respeta la cola de núcleos (cola.mjs).
//
//   node scripts/fotos.mjs src/v2/001/index.tsx Reel001v2 out/v2/001 0,40,95,150,217
//   node scripts/fotos.mjs src/v2/001/index.tsx Reel001v2 out/v2/001 cada=30 --hoja
//   node scripts/fotos.mjs src/v2/001/index.tsx Reel001v2 out/v2/001 0,120 --mp4 --nucleos 4
//
// Mucho más rápido que un `npx remotion still` por foto (cada uno empaqueta y abre Chrome).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { bundle } from '@remotion/bundler'
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer'
import { pedir } from './cola.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [entrada, comp, dirSalida, cuadros = 'cada=30'] = process.argv.slice(2)
if (!entrada || !comp || !dirSalida) {
  console.error('uso: fotos.mjs <entrada.tsx> <Composición> <carpeta> <0,30,60 | cada=N> [--hoja] [--mp4] [--nucleos N]')
  process.exit(2)
}
const opt = (n) => process.argv.includes('--' + n)
const iN = process.argv.indexOf('--nucleos')
const nucleos = Math.min(8, iN > 0 ? Number(process.argv[iN + 1]) : 4)
fs.mkdirSync(path.resolve(RAIZ, dirSalida), { recursive: true })

const t0 = Date.now()
const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + ' s'

const serveUrl = await bundle({ entryPoint: path.resolve(RAIZ, entrada), enableCaching: true, publicDir: path.join(RAIZ, 'public') })
console.log(`empaquetado · ${seg()}`)

const soltar = await pedir(opt('mp4') ? nucleos : 2)
const navegador = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } })
try {
  const composicion = await selectComposition({ serveUrl, id: comp, puppeteerInstance: navegador })
  const dur = composicion.durationInFrames
  const lista = cuadros.startsWith('cada=')
    ? Array.from({ length: Math.ceil(dur / Number(cuadros.slice(5))) }, (_, i) => i * Number(cuadros.slice(5)))
    : cuadros.split(',').map(Number)
  const frames = [...new Set(lista.map((f) => Math.max(0, Math.min(dur - 1, f))))]
  for (const f of frames) {
    await renderStill({ serveUrl, composition: composicion, frame: f, output: path.resolve(RAIZ, dirSalida, `f${f}.png`), puppeteerInstance: navegador, overwrite: true })
  }
  console.log(`${frames.length} fotos → ${dirSalida}/f<n>.png (${frames.join(', ')}) · ${seg()}`)

  if (opt('hoja') && frames.length === 1) {
    // xstack necesita 2 entradas o más: con una sola foto, la hoja es esa foto reducida
    execFileSync('nice', ['-n', '10', 'ffmpeg', '-v', 'error', '-y', '-threads', '2', '-i', path.resolve(RAIZ, dirSalida, `f${frames[0]}.png`), '-vf', 'scale=270:-1', path.resolve(RAIZ, dirSalida, 'hoja.png')])
  } else if (opt('hoja')) {
    const cols = Math.min(6, frames.length)
    const entradas = frames.flatMap((f) => ['-i', path.resolve(RAIZ, dirSalida, `f${f}.png`)])
    // cada foto a 270×480 y en rejilla de `cols` columnas (las celdas vacías quedan negras)
    const filtro =
      frames.map((_, i) => `[${i}:v]scale=270:-1[v${i}]`).join(';') +
      ';' +
      frames.map((_, i) => `[v${i}]`).join('') +
      `xstack=inputs=${frames.length}:fill=black:layout=${frames.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join('|')}[h]`
    execFileSync('nice', ['-n', '10', 'ffmpeg', '-v', 'error', '-y', '-threads', '2', ...entradas, '-filter_complex', filtro, '-map', '[h]', '-frames:v', '1', path.resolve(RAIZ, dirSalida, 'hoja.png')])
    console.log(`hoja → ${dirSalida}/hoja.png · ${seg()}`)
  }

  if (opt('mp4')) {
    await renderMedia({
      serveUrl,
      composition: composicion,
      codec: 'h264',
      outputLocation: path.resolve(RAIZ, dirSalida, 'escena.mp4'),
      concurrency: nucleos,
      puppeteerInstance: navegador,
      overwrite: true,
    })
    console.log(`mp4 → ${dirSalida}/escena.mp4 (${nucleos} núcleos) · ${seg()}`)
  }
} finally {
  await navegador.close({ silent: true })
  soltar()
}
