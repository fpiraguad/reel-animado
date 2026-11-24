import { Easing, interpolate } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Geist'
import { loadFont as loadMono } from '@remotion/google-fonts/GeistMono'
import { loadFont as loadSerif } from '@remotion/google-fonts/CormorantGaramond'

import type { Palabra } from './tipos'

const geist = loadFont('normal', { weights: ['400', '500', '600', '700', '800', '900'], subsets: ['latin'] })
const mono = loadMono('normal', { weights: ['400', '500', '700'], subsets: ['latin'] })
const serif = loadSerif('normal', { weights: ['500', '600', '700'], subsets: ['latin'] })
loadSerif('italic', { weights: ['500', '600'], subsets: ['latin'] })

// ─── Estilos ───────────────────────────────────────────────────────────────
// Tema de los componentes de src/visual/. Blanco y negro, minimalistas; el color solo aparece
// en los conceptos (ver `herramientas`). `papel` es el fondo y `tinta` la figura, aunque el
// fondo sea negro. El estilo se escoge con `usarEstilo(nombre)` al empezar a pintar.

export type Resaltado = 'color' | 'caja' | 'italica' | 'subrayado'
export type Textura = 'puntos' | 'grano' | 'reticula' | 'ninguna'

export interface Estilo {
  nombre: string
  c: { papel: string; papel2: string; tinta: string; tinta2: string; acento: string; acentoSuave: string }
  f: { display: string; texto: string; mono: string }
  pesoDisplay: number
  tracking: number // fracción del cuerpo (negativa = más apretado)
  italicaDisplay: boolean
  resaltado: Resaltado
  textura: Textura
  radio: number // multiplica las esquinas redondeadas (0 = esquinas rectas)
  ritmo: number // multiplica la duración de las entradas (1.4 = más pausado)
  invierteAlternas: boolean // escenas pares en negativo
  kickerMayus: boolean
}

const naranja = 'oklch(0.6 0.16 48)'

export const estilos: Record<string, Estilo> = {
  // Papel cálido y un acento naranja.
  naranja: {
    nombre: 'Papel y naranja',
    c: { papel: 'oklch(0.975 0.006 85)', papel2: 'oklch(0.93 0.01 85)', tinta: 'oklch(0.2 0.012 260)', tinta2: 'oklch(0.45 0.01 260)', acento: naranja, acentoSuave: 'oklch(0.9 0.05 60)' },
    f: { display: geist.fontFamily, texto: geist.fontFamily, mono: mono.fontFamily },
    pesoDisplay: 800, tracking: -0.035, italicaDisplay: false, resaltado: 'color', textura: 'puntos', radio: 1, ritmo: 1, invierteAlternas: false, kickerMayus: true,
  },
  // Negro, serif clásica, grano de película y pausas largas.
  estoico: {
    nombre: 'Estoico',
    c: { papel: '#0a0a0a', papel2: '#1c1c1c', tinta: '#f1eee6', tinta2: '#8c8880', acento: '#f1eee6', acentoSuave: '#2a2a2a' },
    f: { display: serif.fontFamily, texto: geist.fontFamily, mono: mono.fontFamily },
    pesoDisplay: 600, tracking: -0.012, italicaDisplay: false, resaltado: 'italica', textura: 'grano', radio: 0, ritmo: 1.45, invierteAlternas: false, kickerMayus: true,
  },
  // Blanco suizo: grotesca negra, retícula fina, resaltado en caja negra.
  suizo: {
    nombre: 'Suizo',
    c: { papel: '#fafaf8', papel2: '#e9e9e6', tinta: '#0a0a0a', tinta2: '#6b6b6b', acento: '#0a0a0a', acentoSuave: '#e9e9e6' },
    f: { display: geist.fontFamily, texto: geist.fontFamily, mono: mono.fontFamily },
    pesoDisplay: 800, tracking: -0.04, italicaDisplay: false, resaltado: 'caja', textura: 'reticula', radio: 0, ritmo: 1, invierteAlternas: false, kickerMayus: true,
  },
  // Terminal: negro, todo en monoespaciada, subrayado grueso.
  terminal: {
    nombre: 'Terminal',
    c: { papel: '#050505', papel2: '#1a1a1a', tinta: '#ededed', tinta2: '#7a7a7a', acento: '#ededed', acentoSuave: '#222' },
    f: { display: mono.fontFamily, texto: mono.fontFamily, mono: mono.fontFamily },
    pesoDisplay: 700, tracking: -0.045, italicaDisplay: false, resaltado: 'subrayado', textura: 'puntos', radio: 0.35, ritmo: 1, invierteAlternas: false, kickerMayus: true,
  },
  // Contraste: escenas que alternan blanco y negro, grotesca gigante.
  contraste: {
    nombre: 'Contraste',
    c: { papel: '#ffffff', papel2: '#ececec', tinta: '#000000', tinta2: '#6e6e6e', acento: '#000000', acentoSuave: '#ececec' },
    f: { display: geist.fontFamily, texto: geist.fontFamily, mono: mono.fontFamily },
    pesoDisplay: 900, tracking: -0.05, italicaDisplay: false, resaltado: 'caja', textura: 'ninguna', radio: 0.5, ritmo: 0.9, invierteAlternas: true, kickerMayus: true,
  },
}

export const ESTILO_POR_DEFECTO = 'suizo'

/**
 * Un color fijo por concepto: el único color en los estilos blanco y negro. Cada concepto
 * (una herramienta, un canal, un tipo de dato…) conserva su color en todo el reel para que el
 * ojo lo reconozca sin leer. Es un ejemplo editable: cambia nombres y colores por los de tu
 * tema, o añade claves nuevas. `texto` es el color legible encima de `color`.
 */
export const herramientas: Record<string, { nombre: string; color: string; texto: string }> = {
  asistente: { nombre: 'Asistente', color: '#D97757', texto: '#fff' },
  editor: { nombre: 'Editor', color: '#10A37F', texto: '#fff' },
  constructor: { nombre: 'Constructor', color: '#F2547D', texto: '#fff' },
  mapas: { nombre: 'Mapas', color: '#34A853', texto: '#fff' },
  buscador: { nombre: 'Buscador', color: '#4285F4', texto: '#fff' },
  mensajes: { nombre: 'Mensajes', color: '#25D366', texto: '#062e16' },
  redes: { nombre: 'Redes', color: '#E1306C', texto: '#fff' },
  correo: { nombre: 'Correo', color: '#EA4335', texto: '#fff' },
  hoja: { nombre: 'Hoja de cálculo', color: '#217346', texto: '#fff' },
  anuncios: { nombre: 'Anuncios', color: '#0866FF', texto: '#fff' },
}
/** Alias con nombre explícito de `herramientas`. */
export const CONCEPTOS = herramientas

// El estilo activo. Remotion renderiza una composición por pestaña, así que basta
// con fijarlo al empezar a pintar el reel (llamando a `usarEstilo`).
export const c = { ...estilos.suizo.c }
export const f = { ...estilos.suizo.f }
export const e: Estilo = { ...estilos.suizo }

export function usarEstilo(nombre: string | undefined, invertido = false) {
  const base = estilos[nombre || ESTILO_POR_DEFECTO] || estilos[ESTILO_POR_DEFECTO]
  Object.assign(e, base)
  Object.assign(f, base.f)
  Object.assign(c, base.c)
  if (invertido) Object.assign(c, { papel: base.c.tinta, tinta: base.c.papel, papel2: base.c.tinta2, tinta2: base.c.papel2, acento: base.c.papel })
}

/** Radio de esquina escalado por el estilo (999 = píldora, o recto si el estilo no redondea). */
export const rad = (n: number) => (n >= 999 ? (e.radio === 0 ? 0 : 999) : n * e.radio)

export const FPS = 30
export const W = 1080
export const H = 1920

// Una sola curva en toda la pieza: entra rápido y frena en seco.
export const ease = Easing.bezier(0.16, 1, 0.3, 1)

/** 0→1 entre `desde` y `desde+dur` (frames), estirado por el `ritmo` del estilo. */
export const prog = (frame: number, desde: number, dur: number) =>
  interpolate(frame, [desde, desde + dur * e.ritmo], [0, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

/** Entrada: opacidad, 26 px hacia arriba y desenfoque 10→0. */
export const entra = (frame: number, desde: number, dur = 11, dy = 26) => {
  const p = prog(frame, desde, dur)
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * dy}px)`,
    filter: `blur(${(1 - p) * 10}px)`,
  }
}

const limpia = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '')

/** Frame (relativo a la escena) en que se empieza a decir `palabra`. */
export const enPalabra = (palabras: Palabra[], palabra: string | undefined, porDefecto: number) => {
  if (!palabra) return porDefecto
  const w = palabras.find((p) => limpia(p.texto) === limpia(palabra))
  return w ? Math.round(w.inicio * FPS) : porDefecto
}

/** Parte "texto con *resaltado*" en palabras, marcando las resaltadas. */
export const partes = (texto: string) => {
  const out: { t: string; r: boolean }[] = []
  texto.split(/(\*[^*]+\*)/).forEach((seg) => {
    const r = seg.startsWith('*') && seg.endsWith('*')
    seg.replace(/\*/g, '').split(/\s+/).filter(Boolean).forEach((t) => {
      // Un signo suelto ("?", ".") se pega a la palabra anterior.
      if (/^[?!.,:;…]+$/.test(t) && out.length) out[out.length - 1].t += t
      else out.push({ t, r })
    })
  })
  return out
}
