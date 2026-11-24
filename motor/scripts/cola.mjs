#!/usr/bin/env node
// Cola de núcleos compartida por TODOS los renders de la máquina (procesos paralelos incluidos):
// nunca se pasan de TOTAL núcleos de render a la vez. Por render, 8 suele ser lo más rápido; más
// núcleos en un solo render tienden a hacerlo más lento.
//
//   Como módulo:  import { pedir } from './cola.mjs'; const soltar = await pedir(4); … soltar()
//   Como comando: node scripts/cola.mjs 8 -- npx remotion render …   (espera turno, corre, suelta)
//
// TOTAL = COLA_NUCLEOS (entorno) o, si no está, la mitad de los núcleos de la máquina.
// Cada trabajo deja un archivo <pid>-<núcleos> en <tmp>/remotion-cola; los de procesos muertos se
// ignoran y se borran. La revisión-y-reserva va dentro de un candado (mkdir atómico).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

export const TOTAL = Math.max(1, Number(process.env.COLA_NUCLEOS) || Math.floor(os.cpus().length / 2))
const DIR = path.join(os.tmpdir(), 'remotion-cola')
const CANDADO = path.join(DIR, '.candado')

const vivo = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

const enUso = () =>
  fs.readdirSync(DIR).reduce((suma, f) => {
    const m = f.match(/^(\d+)-(\d+)(?:-\w+)?$/)
    if (!m) return suma
    if (!vivo(Number(m[1]))) {
      fs.rmSync(path.join(DIR, f), { force: true })
      return suma
    }
    return suma + Number(m[2])
  }, 0)

const conCandado = async (fn) => {
  for (;;) {
    try {
      fs.mkdirSync(CANDADO)
      break
    } catch {
      // candado viejo (más de 5 s): lo rompemos
      try {
        if (Date.now() - fs.statSync(CANDADO).mtimeMs > 5000) fs.rmSync(CANDADO, { recursive: true, force: true })
      } catch {}
      await dormir(40)
    }
  }
  try {
    return fn()
  } finally {
    fs.rmSync(CANDADO, { recursive: true, force: true })
  }
}

/** Espera hasta que haya `n` núcleos libres, los reserva y devuelve la función para soltarlos. */
export async function pedir(n, avisar = true) {
  n = Math.max(1, Math.min(8, TOTAL, n))
  fs.mkdirSync(DIR, { recursive: true })
  const ficha = path.join(DIR, `${process.pid}-${n}-${Math.random().toString(36).slice(2, 7)}`)
  let esperando = false
  for (;;) {
    const ok = await conCandado(() => {
      if (enUso() + n > TOTAL) return false
      fs.writeFileSync(ficha, '')
      return true
    })
    if (ok) break
    if (avisar && !esperando) {
      console.error(`[cola] esperando ${n} núcleos (en uso ${enUso()}/${TOTAL})…`)
      esperando = true
    }
    await dormir(500)
  }
  const soltar = () => fs.rmSync(ficha, { force: true })
  process.on('exit', soltar)
  return soltar
}

// Uso como comando
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const n = Number(process.argv[2])
  const sep = process.argv.indexOf('--')
  if (!n || sep < 0) {
    console.error('uso: node scripts/cola.mjs <núcleos> -- <comando…>')
    process.exit(2)
  }
  const [cmd, ...args] = process.argv.slice(sep + 1)
  const soltar = await pedir(n)
  const hijo = spawn('nice', ['-n', '10', cmd, ...args], { stdio: 'inherit' })
  hijo.on('exit', (code) => {
    soltar()
    process.exit(code ?? 1)
  })
}
