#!/usr/bin/env node
// Render final de un reel v2: video + portada, color bt709 rango limitado y audio a −14 LUFS.
//   node scripts/render-v2.mjs 001 [--nucleos 8] [--gl angle]
// Necesita src/v2/<NNN>/index.tsx (lo arma scripts/indice-v2.mjs) y guiones/<NNN>-*.json.
// Sale en salidas/<id>.mp4 y salidas/<id>-portada.png (<id> = el id del guion). Todo con nice -n 10
// y pasando por la cola de núcleos (scripts/cola.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { pedir, TOTAL } from './cola.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nnn = process.argv[2]
if (!/^\d{3}$/.test(nnn ?? '')) {
  console.error('uso: node scripts/render-v2.mjs NNN [--nucleos N]')
  process.exit(2)
}
const i = process.argv.indexOf('--nucleos')
const nucleos = String(Math.max(1, Math.min(8, TOTAL, i > 0 ? Number(process.argv[i + 1]) : 8)))
// Efectos WebGL (LightLeak, shaders) necesitan --gl angle.
const g = process.argv.indexOf('--gl')
const gl = g > 0 ? [`--gl=${process.argv[g + 1]}`] : []
const id = fs.readdirSync(path.join(RAIZ, 'guiones')).find((f) => f.startsWith(nnn + '-') && f.endsWith('.json'))?.replace(/\.json$/, '')
if (!id) throw new Error(`No hay guion guiones/${nnn}-*.json`)
const entrada = `src/v2/${nnn}/index.tsx`
if (!fs.existsSync(path.join(RAIZ, entrada))) throw new Error(`Falta ${entrada}: corre antes node scripts/indice-v2.mjs ${nnn}`)
const comp = `Reel${nnn}v2`
const crudo = path.join(os.tmpdir(), `${id}-v2-crudo-${process.pid}.mp4`)
const salida = path.join(RAIZ, 'salidas', `${id}.mp4`)
const portada = path.join(RAIZ, 'salidas', `${id}-portada.png`)
fs.mkdirSync(path.dirname(salida), { recursive: true })

const correr = (cmd, args) => execFileSync('nice', ['-n', '10', cmd, ...args], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'inherit'] }).toString()

const soltar = await pedir(Number(nucleos))
try {
  correr('npx', ['remotion', 'still', entrada, `${comp}Portada`, portada, '--frame=0', ...gl])
  correr('npx', ['remotion', 'render', entrada, comp, crudo, `--concurrency=${nucleos}`, ...gl])
  correr('ffmpeg', [
    '-v', 'error', '-threads', nucleos, '-y', '-i', crudo,
    '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', salida,
  ])
} finally {
  soltar()
  fs.rmSync(crudo, { force: true })
}
const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', salida]).toString().trim()
console.log(`${salida} · ${Number(dur).toFixed(1)} s`)
console.log(portada)
