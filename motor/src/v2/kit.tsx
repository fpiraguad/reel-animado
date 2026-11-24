import React from 'react'
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from 'remotion'
import { loadFont as loadInterTight } from '@remotion/google-fonts/InterTight'
import { loadFont as loadJetBrains } from '@remotion/google-fonts/JetBrainsMono'

// Kit visual de los reels v2 — paleta «Noche de laboratorio» (fondo casi negro, glows de color).
// Reglas de movimiento: una sola curva (ease), entradas con desenfoque, algo nuevo en pantalla
// cada 2–4 s, nada pegado a las esquinas, nada de gradientes de arcoíris ni rebotes exagerados.

const inter = loadInterTight('normal', { weights: ['500', '600', '700', '800', '900'], subsets: ['latin'] })
const jet = loadJetBrains('normal', { weights: ['500', '700', '800'], subsets: ['latin'] })

export const FPS = 30
export const W = 1080
export const H = 1920
/** Frames congelados al inicio: el gancho completo se ve desde el cuadro 0 (sirve de miniatura). */
export const PRE = 12

/**
 * Zona útil del cuadro vertical: x 70–950 (a la derecha va la interfaz de la app de video:
 * likes, comentarios…) e y 240–1240 (debajo van los subtítulos).
 */
export const ZONA = { x0: 70, x1: 950, y0: 240, y1: 1240, ancho: 880, alto: 1000, cx: 510 }

export const N = {
  fondo: '#0B0B0F',
  tarjeta: '#14141B',
  tarjeta2: '#1C1C26',
  linea: '#26262F',
  texto: '#F5F5F7',
  texto2: '#9A9AA8',
  texto3: '#5E5E6E',
  meta: '#FFD166', // meta, cronómetro, resaltado
  rojo: '#FF5C5C',
  ok: '#4ADE80',
  // Dos acentos, cada uno ligado SIEMPRE al mismo concepto en todo el reel (ver CONCEPTOS).
  acento1: '#D97757',
  acento1Suave: '#F2A27F',
  acento2: '#10A37F',
  acento2Suave: '#4FD1A5',
  fTexto: inter.fontFamily,
  fMono: jet.fontFamily,
}

/**
 * Un color fijo por concepto. Si el reel compara dos cosas (dos herramientas, dos métodos,
 * antes/después), cada una tiene su color y lo conserva en chips, glows y subtítulos.
 * Edita `nombre` y `palabras` para tu tema: `palabras` son los prefijos (en minúscula) que,
 * dichos en la voz, pintan la palabra activa del subtítulo con el color del concepto.
 */
export type Concepto = 'a' | 'b'
export const CONCEPTOS: Record<Concepto, { nombre: string; color: string; color2: string; palabras: string[] }> = {
  a: { nombre: 'Alfa', color: N.acento1, color2: N.acento1Suave, palabras: ['alfa'] },
  b: { nombre: 'Beta', color: N.acento2, color2: N.acento2Suave, palabras: ['beta'] },
}

// ─── Tiempo ────────────────────────────────────────────────────────────────

export const ease = Easing.bezier(0.16, 1, 0.3, 1)
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0)
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1)

/** 0→1 entre `desde` y `desde+dur` (en frames) con la curva del kit. */
export const p = (frame: number, desde: number, dur: number, curva = ease) =>
  interpolate(frame, [desde, desde + Math.max(1, dur)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: curva,
  })

export const seg = (s: number) => Math.round(s * FPS)
/** Frame, relativo al inicio de la escena (t0 en s del audio), de algo que pasa en el segundo `s` del audio. */
export const enEscena = (s: number, t0: number) => Math.round((s - t0) * FPS)
export const mezcla = (a: number, b: number, t: number) => a + (b - a) * t

/** Entrada: opacidad + subida + desenfoque 10→0 px. */
export const entra = (frame: number, desde: number, dur = 11, dy = 26): React.CSSProperties => {
  const t = p(frame, desde, dur)
  return {
    opacity: t,
    transform: `translateY(${(1 - t) * dy}px)`,
    filter: `blur(${(1 - t) * 10}px)`,
  }
}

/** Salida: más corta que la entrada. Combínala con la entrada si hace falta. */
export const sale = (frame: number, desde: number, dur = 8, dy = -18): React.CSSProperties => {
  const t = p(frame, desde, dur, easeIn)
  return {
    opacity: 1 - t,
    transform: `translateY(${t * dy}px)`,
    filter: `blur(${t * 8}px)`,
  }
}

/** Pop con un leve overshoot (forma cerrada, sin spring): 0 → 1.06 → 1. Devuelve la escala. */
export const pop = (frame: number, desde: number, dur = 12) => {
  const t = p(frame, desde, dur)
  return t < 1 ? Math.sin(t * Math.PI * 0.62) / Math.sin(Math.PI * 0.62) * (1 + 0.06 * Math.sin(t * Math.PI)) : 1
}

/** Contador de `0` a `valor` (devuelve número; redondéalo al pintarlo). */
export const contar = (frame: number, desde: number, dur: number, valor: number) => valor * p(frame, desde, dur)

/** Texto tecleado: devuelve el prefijo visible. `cps` = caracteres por segundo. */
export const tecleo = (texto: string, frame: number, desde: number, cps = 32) =>
  texto.slice(0, Math.max(0, Math.floor(((frame - desde) / FPS) * cps)))

/** Cámara en mano muy suave y determinista (desplazamiento en px). */
export const deriva = (frame: number, semilla = 1, amp = 6) => ({
  x: Math.sin(frame / 47 + semilla) * amp + Math.sin(frame / 19 + semilla * 3) * amp * 0.3,
  y: Math.cos(frame / 53 + semilla * 2) * amp + Math.cos(frame / 23 + semilla) * amp * 0.3,
})

// ─── Piezas ────────────────────────────────────────────────────────────────

/** Fondo: negro azulado + dos glows de color que derivan + viñeta + grano. */
export const Fondo: React.FC<{ glowA?: string; glowB?: string; intensidad?: number }> = ({
  glowA = N.acento1,
  glowB = N.acento2,
  intensidad = 1,
}) => {
  const frame = useCurrentFrame()
  const a = deriva(frame, 1, 60)
  const b = deriva(frame, 4, 60)
  return (
    <AbsoluteFill style={{ background: N.fondo }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${180 + a.x}px ${520 + a.y}px, ${glowA}${hex(0.22 * intensidad)}, transparent 70%),
            radial-gradient(900px 900px at ${900 + b.x}px ${1350 + b.y}px, ${glowB}${hex(0.2 * intensidad)}, transparent 70%)`,
        }}
      />
      <AbsoluteFill style={{ background: 'radial-gradient(1400px 1700px at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
      <Grano />
    </AbsoluteFill>
  )
}

/** Grano de película (5 %), cambia cada 2 frames. */
export const Grano: React.FC<{ opacidad?: number }> = ({ opacidad = 0.05 }) => {
  const frame = useCurrentFrame()
  const s = Math.floor(frame / 2) % 8
  return (
    <AbsoluteFill style={{ opacity: opacidad, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <svg width={W} height={H}>
        <filter id={`grano-${s}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={s} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter={`url(#grano-${s})`} />
      </svg>
    </AbsoluteFill>
  )
}

/** Alfa en hex de 2 dígitos para concatenar a un color #RRGGBB. */
export const hex = (a: number) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0')

/** Glifo genérico del concepto (no es el logo de ninguna marca): `a` = asterisco, `b` = terminal. */
export const Logo: React.FC<{ h: Concepto; size?: number }> = ({ h, size = 44 }) => {
  const col = CONCEPTOS[h].color
  if (h === 'a') {
    // asterisco de 8 brazos
    const brazos = Array.from({ length: 8 }, (_, i) => i * 45)
    return (
      <svg width={size} height={size} viewBox="-50 -50 100 100">
        {brazos.map((ang) => (
          <rect key={ang} x={-6} y={-46} width={12} height={40} rx={6} fill={col} transform={`rotate(${ang})`} />
        ))}
      </svg>
    )
  }
  // cuadrado redondeado con «>_»
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x={4} y={4} width={92} height={92} rx={26} fill={col} />
      <path d="M28 34 L46 50 L28 66" stroke={N.fondo} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x={52} y={60} width={22} height={9} rx={4.5} fill={N.fondo} />
    </svg>
  )
}

/** Píldora con glifo + nombre del concepto y glow de su color. */
export const Chip: React.FC<{ h: Concepto; size?: number; glow?: number; style?: React.CSSProperties }> = ({
  h,
  size = 40,
  glow = 0.5,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.32,
      padding: `${size * 0.28}px ${size * 0.6}px ${size * 0.28}px ${size * 0.34}px`,
      borderRadius: 999,
      background: N.tarjeta2,
      border: `2px solid ${CONCEPTOS[h].color}${hex(0.7)}`,
      boxShadow: `0 0 ${size}px ${CONCEPTOS[h].color}${hex(glow * 0.6)}`,
      fontFamily: N.fTexto,
      fontWeight: 800,
      fontSize: size * 0.72,
      letterSpacing: -0.5,
      color: N.texto,
      ...style,
    }}
  >
    <Logo h={h} size={size * 0.9} />
    {CONCEPTOS[h].nombre}
  </div>
)

/** Tarjeta oscura con borde fino; `glow` = color del brillo exterior. */
export const Tarjeta: React.FC<{
  style?: React.CSSProperties
  glow?: string
  fuerza?: number
  children?: React.ReactNode
}> = ({ style, glow, fuerza = 0.6, children }) => (
  <div
    style={{
      background: N.tarjeta,
      border: `2px solid ${glow ? glow + hex(0.55) : N.linea}`,
      borderRadius: 28,
      boxShadow: glow ? `0 0 70px ${glow}${hex(fuerza * 0.45)}, inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
)

/** Etiqueta en versales monoespaciadas con un punto de color. */
export const Kicker: React.FC<{ texto: string; color?: string; style?: React.CSSProperties }> = ({ texto, color = N.meta, style }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontFamily: N.fMono,
      fontWeight: 700,
      fontSize: 28,
      letterSpacing: 6,
      color: N.texto2,
      textTransform: 'uppercase',
      ...style,
    }}
  >
    <span style={{ width: 14, height: 14, borderRadius: 7, background: color, boxShadow: `0 0 18px ${color}` }} />
    {texto}
  </div>
)

/** Cursor tipo flecha con halo de clic en cada frame de `clics`. Posición en px absolutos. */
export const Cursor: React.FC<{ x: number; y: number; clics?: number[]; color?: string; escala?: number }> = ({
  x,
  y,
  clics = [],
  color = N.meta,
  escala = 1,
}) => {
  const frame = useCurrentFrame()
  const ultimo = clics.filter((c) => c <= frame).pop()
  const t = ultimo === undefined ? 1 : p(frame, ultimo, 14)
  const presion = ultimo === undefined ? 1 : 1 - 0.12 * Math.sin(Math.min(1, (frame - ultimo) / 6) * Math.PI)
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none' }}>
      {t < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: -40 * (0.4 + t),
            top: -40 * (0.4 + t),
            width: 80 * (0.4 + t),
            height: 80 * (0.4 + t),
            borderRadius: 999,
            border: `4px solid ${color}`,
            opacity: 1 - t,
          }}
        />
      ) : null}
      <svg
        width={46 * escala}
        height={56 * escala}
        viewBox="0 0 46 56"
        style={{ transform: `scale(${presion})`, transformOrigin: '0 0', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))' }}
      >
        <path d="M2 2 L2 44 L13 34 L21 53 L29 49 L21 31 L36 31 Z" fill="#fff" stroke="#111" strokeWidth={3} strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** Mueve el cursor por una lista de puntos [frame, x, y] con curva suave entre cada par. */
export const rutaCursor = (frame: number, puntos: [number, number, number][]) => {
  if (frame <= puntos[0][0]) return { x: puntos[0][1], y: puntos[0][2] }
  for (let i = 1; i < puntos.length; i++) {
    const [f0, x0, y0] = puntos[i - 1]
    const [f1, x1, y1] = puntos[i]
    if (frame <= f1) {
      const t = p(frame, f0, f1 - f0, easeInOut)
      return { x: mezcla(x0, x1, t), y: mezcla(y0, y1, t) }
    }
  }
  const u = puntos[puntos.length - 1]
  return { x: u[1], y: u[2] }
}

/** Ruido determinista en [0,1) (mismo valor en cada render para la misma semilla). */
export const azar = (semilla: string | number) => random(semilla)
