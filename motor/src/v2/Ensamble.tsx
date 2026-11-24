import React from 'react'
import { AbsoluteFill, Audio, Freeze, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion'

import { N, PRE, FPS, seg, p, easeIn, Fondo, CONCEPTOS } from './kit'
import { SONIDOS, TipoSonido } from './sonido'

// Ensamblador de los reels v2: pre-roll con el gancho completo congelado, escenas con transición
// zoom + desenfoque, fondo cuyo color cambia por acto, subtítulos de 1–4 palabras sincronizados con
// la voz, voz, música y SFX. Cada reel arma su `ConfigReel` en src/v2/<NNN>/index.tsx
// (lo genera `npm run indice -- NNN` a partir del BRIEF.md del reel).

/** Un efecto de sonido: `f` = frame relativo al inicio de la escena. */
export type Efecto = { f: number; tipo: TipoSonido; vol?: number }
export type EscenaV2 = {
  id: string
  /** Componente de la escena. Con `portada` debe pintarse ya completa (es el cuadro 0 y la miniatura). */
  C: React.FC<{ portada?: boolean }>
  /** Inicio y fin de la escena, en segundos del audio de la voz. */
  t0: number
  t1: number
  sfx: Efecto[]
  /** Par de colores del fondo en esta escena; si falta, se toma de GLOWS por turno. */
  glow?: [string, string]
}
/** Palabra con tiempos (segundos) tal como la deja el paso de voz en narracion.json. */
export type Palabra = { texto: string; inicio: number; fin: number }
export type ConfigReel = {
  id: string
  voz: string // ruta bajo public/
  palabras: Palabra[]
  escenas: EscenaV2[]
  fin: number // segundos del audio en que termina el reel
  /** Pista de música (ruta bajo public/) y volumen lineal. Si falta, el reel sale sin música. */
  musica?: { archivo: string; vol: number }
  /** 'noche' pinta Fondo del kit; 'propio' = cada escena pinta su fondo (p. ej. estilo claro). */
  fondo?: 'noche' | 'propio'
  /** Subtítulos claros (texto blanco, para fondos oscuros) u oscuros (para fondos claros); o una función del segundo del audio. */
  subtitulos?: 'claros' | 'oscuros' | ((s: number) => 'claros' | 'oscuros')
  /** Color de la palabra activa según la palabra (por defecto: color del concepto si coincide, si no amarillo). */
  colorPalabra?: (texto: string) => string
  /** Caja oscura detrás de los subtítulos (para fondos claros o con detalle, p. ej. fotos). */
  subtitulosCaja?: boolean
  /** Fondo base de la composición (por defecto N.fondo). */
  base?: string
}

/** Frames de cruce entre escenas. */
const CRUCE = 8
const GLOWS: [string, string][] = [
  [N.acento1, N.acento2],
  [N.meta, N.acento2],
  [N.acento2, N.acento1],
  [N.meta, N.rojo],
  [N.acento2, N.acento1],
  [N.acento1, N.meta],
]

export const duracionReel = (c: ConfigReel) => PRE + seg(c.fin)

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mezclaColor = (a: string, b: string, t: number) =>
  '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')

const glowDe = (c: ConfigReel, i: number) => c.escenas[i].glow ?? GLOWS[i % GLOWS.length]

const FondoActos: React.FC<{ c: ConfigReel }> = ({ c }) => {
  const frame = useCurrentFrame()
  const s = (frame - PRE) / FPS
  let i = c.escenas.findIndex((e) => s < e.t1)
  if (i < 0) i = c.escenas.length - 1
  const a = glowDe(c, i)
  const b = glowDe(c, Math.max(0, i - 1))
  const t = p(frame, PRE + seg(c.escenas[i].t0), 18)
  return <Fondo glowA={mezclaColor(b[0], a[0], t)} glowB={mezclaColor(b[1], a[1], t)} />
}

const ConTransicion: React.FC<{ dur: number; primera: boolean; ultima: boolean; children: React.ReactNode }> = ({
  dur,
  primera,
  ultima,
  children,
}) => {
  const frame = useCurrentFrame()
  const tin = primera ? 1 : p(frame, 0, CRUCE)
  const tout = ultima ? 0 : p(frame, dur - CRUCE, CRUCE, easeIn)
  const escala = (primera ? 1 : interpolate(tin, [0, 1], [0.94, 1])) * interpolate(tout, [0, 1], [1, 1.08])
  const blur = (1 - tin) * 14 + tout * 16
  return (
    <AbsoluteFill style={{ opacity: tin * (1 - tout), transform: `scale(${escala})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  )
}

/** Agrupa palabras en bloques de subtítulo: corta en pausas > 0,22 s, a las 4 palabras, a los 22 caracteres o tras puntuación. */
const agrupar = (palabras: Palabra[]) => {
  const out: Palabra[][] = []
  let g: Palabra[] = []
  palabras.forEach((w, i) => {
    const prev = palabras[i - 1]
    const pausa = prev ? w.inicio - prev.fin > 0.22 : false
    const largo = g.map((x) => x.texto).join(' ').length + w.texto.length
    if (g.length && (pausa || g.length >= 4 || largo > 22 || /[.,:…?!]$/.test(prev?.texto ?? ''))) {
      out.push(g)
      g = []
    }
    g.push(w)
  })
  if (g.length) out.push(g)
  return out
}

const colorPorDefecto = (t: string) => {
  const l = t.toLowerCase()
  for (const k of Object.values(CONCEPTOS)) {
    if (k.palabras.some((pref) => l.startsWith(pref))) return k.color2
  }
  return N.meta
}

const Subtitulos: React.FC<{ c: ConfigReel; grupos: Palabra[][] }> = ({ c, grupos }) => {
  const frame = useCurrentFrame()
  const s = frame / FPS
  const gi = grupos.findIndex((g, i) => s >= g[0].inicio - 0.05 && s < (grupos[i + 1]?.[0].inicio ?? g[g.length - 1].fin + 0.6) - 0.05)
  if (gi < 0) return null
  const g = grupos[gi]
  const t = p(frame, Math.round((g[0].inicio - 0.05) * FPS), 6)
  const modo = typeof c.subtitulos === 'function' ? c.subtitulos(s) : c.subtitulos
  const oscuros = modo === 'oscuros'
  const base = oscuros ? '#121216' : N.texto
  const color = c.colorPalabra ?? colorPorDefecto
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        width: 880,
        top: 1318,
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '0 18px',
        fontFamily: N.fTexto,
        fontWeight: 900,
        fontSize: 66,
        letterSpacing: -1.5,
        lineHeight: 1.12,
        textAlign: 'center',
        opacity: t,
        transform: `translateY(${(1 - t) * 14}px) scale(${0.96 + 0.04 * t})`,
        ...(c.subtitulosCaja ? { background: 'rgba(8,8,12,0.72)', borderRadius: 26, padding: '14px 26px', boxSizing: 'border-box' as const } : {}),
      }}
    >
      {g.map((w, i) => {
        const dicha = s >= w.inicio - 0.03
        const ahora = dicha && s < w.fin + 0.08
        return (
          <span
            key={i}
            style={{
              color: ahora ? color(w.texto) : dicha ? base : `${base}55`,
              textShadow: oscuros ? '0 2px 14px rgba(255,255,255,0.9)' : '0 4px 18px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)',
            }}
          >
            {w.texto.replace(/[…]$/, '')}
          </span>
        )
      })}
    </div>
  )
}

/** SFX de cada escena más un whoosh automático en cada cambio de escena. */
const Efectos: React.FC<{ c: ConfigReel }> = ({ c }) => (
  <>
    {c.escenas.flatMap((e, i) => {
      const base = PRE + seg(e.t0)
      const lista = e.sfx.map((s, j) => {
        const def = SONIDOS[s.tipo]
        if (!def) return null
        return (
          <Sequence key={`${e.id}-${j}`} from={Math.max(0, base + Math.round(s.f))} durationInFrames={def.frames} layout="none" name={`sfx-${e.id}-${s.tipo}`}>
            <Audio src={staticFile(def.archivo)} volume={s.vol ?? def.vol} />
          </Sequence>
        )
      })
      if (i > 0) {
        const def = SONIDOS.whoosh
        lista.push(
          <Sequence key={`${e.id}-cruce`} from={base - 6} durationInFrames={def.frames} layout="none" name={`sfx-${e.id}-cruce`}>
            <Audio src={staticFile(def.archivo)} volume={def.vol * 0.8} />
          </Sequence>,
        )
      }
      return lista
    })}
  </>
)

/** El reel completo. Con `portada` devuelve un solo cuadro: la primera escena ya armada. */
export const ReelV2: React.FC<{ c: ConfigReel; portada?: boolean }> = ({ c, portada }) => {
  const grupos = React.useMemo(() => agrupar(c.palabras), [c.palabras])
  const S1 = c.escenas[0].C
  const base = c.base ?? N.fondo
  const fondo = c.fondo === 'propio' ? null : <FondoActos c={c} />
  if (portada) {
    return (
      <AbsoluteFill style={{ background: base }}>
        {c.fondo === 'propio' ? null : <Fondo />}
        <S1 portada />
      </AbsoluteFill>
    )
  }
  const total = duracionReel(c)
  const musica = c.musica
  return (
    <AbsoluteFill style={{ background: base }}>
      {fondo}
      <Sequence durationInFrames={PRE} name="gancho-congelado">
        <Freeze frame={0}>
          <S1 portada />
        </Freeze>
      </Sequence>
      {c.escenas.map((e, i) => {
        const ultima = i === c.escenas.length - 1
        const dur = seg(e.t1) - seg(e.t0) + (ultima ? 0 : CRUCE)
        return (
          <Sequence key={e.id} from={PRE + seg(e.t0)} durationInFrames={dur} name={e.id}>
            <ConTransicion dur={dur} primera={i === 0} ultima={ultima}>
              <e.C />
            </ConTransicion>
          </Sequence>
        )
      })}
      <Sequence from={PRE} name="subtitulos">
        <Subtitulos c={c} grupos={grupos} />
      </Sequence>
      <Sequence from={PRE} name="voz">
        <Audio src={staticFile(c.voz)} />
      </Sequence>
      {musica ? (
        <Audio
          src={staticFile(musica.archivo)}
          volume={(f) => musica.vol * interpolate(f, [0, 6, total - 40, total], [0.6, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      ) : null}
      <Efectos c={c} />
    </AbsoluteFill>
  )
}
