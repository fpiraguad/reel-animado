import React from 'react'
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Audio } from '@remotion/media'
import { LightLeak } from '@remotion/light-leaks'
import { noise2D } from '@remotion/noise'
import { ding, mouseClick, uiSwitch, whip, whoosh } from '@remotion/sfx'
import { icons, type LucideIcon } from 'lucide-react'

import { FPS, W, H, c, ease, herramientas } from '../tema'

// Kit de movimiento y sonido. Todo sale de useCurrentFrame(): determinista, sin CSS
// transitions. Cada momento clave recibe su frame (`desde`, `hasta`, `frame`) para
// que el motor lo ate a una palabra con enPalabra().

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
/** Acelera hacia el corte (la mitad saliente de una transición). */
const easeIn = Easing.bezier(0.55, 0, 1, 0.45)
/** Movimiento lento de cámara: arranca y frena suave, sin tirón. */
const suave = Easing.bezier(0.45, 0, 0.55, 1)
const CENTRO: [number, number] = [540, 740] // centro de la zona útil (x 70–950, y 240–1240)

// ─── 1 · Cámara ────────────────────────────────────────────────────────────

export type MovCamara = 'zoom' | 'paneo' | 'empuje' | 'deriva'

export interface CamaraProps {
  /** zoom: acercamiento lento y continuo · paneo: desplazamiento lateral lento ·
   *  empuje: acercamiento decidido hacia `foco` (lo lleva al centro) · deriva: cámara en mano sutil. */
  tipo?: MovCamara
  /** Frame (relativo a la escena) en que arranca el movimiento. */
  desde?: number
  /** Frame en que termina. Por defecto, el final de la secuencia que lo contiene. */
  hasta?: number
  /** Escala inicial y final. Por defecto zoom 1→1.07, empuje 1→1.3, paneo 1.06 fija. */
  escalaDesde?: number
  escalaHasta?: number
  /** Punto (px del lienzo 1080×1920) hacia el que se empuja o desde el que se escala. */
  foco?: [number, number]
  /** Desplazamiento total del paneo en px. Por defecto [-70, 0]. */
  paneo?: [number, number]
  /** Empuje: además de escalar, lleva el foco al centro de la zona útil. Por defecto true. */
  centrar?: boolean
  /** Se suma siempre una deriva mínima para que nada quede muerto (0 = apagada). */
  vida?: number
  children: React.ReactNode
}

export const Camara: React.FC<CamaraProps> = ({
  tipo = 'zoom', desde = 0, hasta, escalaDesde, escalaHasta, foco = CENTRO, paneo = [-70, 0], centrar = true, vida = 1, children,
}) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const fin = Math.max(desde + 1, hasta ?? durationInFrames)
  const curva = tipo === 'empuje' ? ease : suave
  const p = interpolate(frame, [desde, fin], [0, 1], { ...clamp, easing: curva })

  const s0 = escalaDesde ?? (tipo === 'paneo' ? 1.06 : 1)
  const s1 = escalaHasta ?? (tipo === 'empuje' ? 1.3 : tipo === 'zoom' ? 1.07 : tipo === 'paneo' ? 1.06 : 1.02)
  const s = s0 + (s1 - s0) * p

  let tx = 0
  let ty = 0
  if (tipo === 'paneo') {
    tx = paneo[0] * (p - 0.5)
    ty = paneo[1] * (p - 0.5)
  }
  if (tipo === 'empuje' && centrar) {
    tx = (CENTRO[0] - foco[0]) * p
    ty = (CENTRO[1] - foco[1]) * p
  }
  // Deriva: ruido suave, nunca un temblor.
  const amp = (tipo === 'deriva' ? 9 : 2.5) * vida
  tx += noise2D('camx', frame / 70, 0) * amp
  ty += noise2D('camy', 0, frame / 80) * amp
  const rot = tipo === 'deriva' ? noise2D('camr', frame / 90, 3) * 0.35 * vida : 0

  return (
    <AbsoluteFill style={{ transformOrigin: `${foco[0]}px ${foco[1]}px`, transform: `translate(${tx}px, ${ty}px) scale(${s}) rotate(${rot}deg)` }}>
      {children}
    </AbsoluteFill>
  )
}

// ─── 2 · Transición ────────────────────────────────────────────────────────

export type TipoTransicion = 'barrido' | 'zoom' | 'deslizar' | 'fundido'

/** Frames de cada mitad (salida y entrada) de una transición. */
export const FRAMES_TRANSICION: Record<TipoTransicion, number> = { barrido: 12, zoom: 12, deslizar: 11, fundido: 6 }

const BANDA_SESGO = 260 // px que se inclina la franja del barrido

/** Desenfoque direccional horizontal (CSS blur() no tiene dirección). */
const FiltroRapidez: React.FC<{ id: string; px: number }> = ({ id, px }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <filter id={id} x="-20%" y="-5%" width="140%" height="110%">
      <feGaussianBlur stdDeviation={`${px.toFixed(2)} 0`} />
    </filter>
  </svg>
)

const Franja: React.FC<{ x: number }> = ({ x }) => (
  <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
    {/* filo gris que va delante: le da profundidad al corte */}
    <polygon
      points={`${x - 70},0 ${x + W + BANDA_SESGO},0 ${x + W},${H} ${x - 70 - BANDA_SESGO},${H}`}
      fill={c.papel2}
    />
    <polygon points={`${x},0 ${x + W + BANDA_SESGO * 2},0 ${x + W + BANDA_SESGO},${H} ${x - BANDA_SESGO},${H}`} fill={c.tinta} />
  </svg>
)

export interface TransicionProps {
  /** Duración total de la escena en frames (la misma que su <Sequence>). */
  frames: number
  /** Cómo entra esta escena (debe coincidir con la `salida` de la anterior). null = sin efecto. */
  entrada?: TipoTransicion | null
  /** Cómo sale esta escena hacia la siguiente. null = sin efecto (última escena). */
  salida?: TipoTransicion | null
  /** Frames de cada mitad; por defecto FRAMES_TRANSICION[tipo]. */
  n?: number
  /** Whoosh sincronizado con el corte (solo lo pone la salida, para no sonar doble). */
  sonido?: boolean
  children: React.ReactNode
}

/**
 * Envuelve el contenido de UNA escena y le aplica la mitad de entrada (frames 0…n) y
 * la de salida (frames−n…frames). Dos escenas seguidas con `salida` y `entrada` iguales
 * forman una transición continua a través del corte, sin solapar secuencias: el motor
 * solo cambia su <Salida> por <Transicion>.
 */
export const Transicion: React.FC<TransicionProps> = ({ frames, entrada = null, salida = null, n, sonido = true, children }) => {
  const frame = useCurrentFrame()
  const id = React.useId().replace(/:/g, '')
  const nIn = entrada ? n ?? FRAMES_TRANSICION[entrada] : 0
  const nOut = salida ? n ?? FRAMES_TRANSICION[salida] : 0
  // pIn: 0 al empezar la escena → 1 cuando ya entró. pOut: 0 → 1 en el último frame.
  const pIn = entrada ? interpolate(frame, [0, nIn], [0, 1], { ...clamp, easing: ease }) : 1
  const pOut = salida ? interpolate(frame, [frames - nOut, frames - 1], [0, 1], { ...clamp, easing: easeIn }) : 0
  const saliendo = salida != null && frame >= frames - nOut
  const tipo = saliendo ? salida : frame < nIn ? entrada : null

  let estilo: React.CSSProperties = {}
  let franja: number | null = null
  let rapidez = 0

  if (tipo === 'barrido') {
    // Salida: la franja entra por la derecha y cubre. Entrada: sigue hacia la izquierda y revela.
    if (saliendo) {
      franja = interpolate(pOut, [0, 1], [W + 80, -BANDA_SESGO])
      estilo = { transform: `translateX(${-90 * pOut}px)` }
    } else {
      franja = interpolate(pIn, [0, 1], [-BANDA_SESGO, -W - BANDA_SESGO * 3])
      estilo = { transform: `translateX(${90 * (1 - pIn)}px)` }
    }
  } else if (tipo === 'zoom') {
    if (saliendo) estilo = { transform: `scale(${1 - 0.2 * pOut})`, filter: `blur(${pOut * 18}px)`, opacity: 1 - pOut }
    else estilo = { transform: `scale(${1 + 0.22 * (1 - pIn)})`, filter: `blur(${(1 - pIn) * 18}px)`, opacity: pIn }
  } else if (tipo === 'deslizar') {
    const x = saliendo ? -W * pOut : W * (1 - pIn)
    // Rapidez ≈ derivada de la curva: máxima pegada al corte.
    rapidez = saliendo ? pOut * 30 : (1 - pIn) * 30
    estilo = { transform: `translateX(${x}px)`, filter: rapidez > 0.5 ? `url(#${id})` : undefined }
  } else if (tipo === 'fundido') {
    const o = saliendo ? 1 - pOut : pIn
    estilo = { opacity: o, filter: `blur(${(1 - o) * 8}px)` }
  }

  return (
    <AbsoluteFill>
      {tipo === 'deslizar' ? <FiltroRapidez id={id} px={rapidez} /> : null}
      <AbsoluteFill style={estilo}>{children}</AbsoluteFill>
      {franja != null ? <Franja x={franja} /> : null}
      {salida && sonido ? <Sfx tipo={salida === 'deslizar' ? 'swish' : 'whoosh'} frame={Math.max(0, frames - Math.min(nOut, 7))} /> : null}
    </AbsoluteFill>
  )
}

// ─── 3 · Íconos flotantes ──────────────────────────────────────────────────

export type IconoFlotante = string | { nombre: string; color?: string }

/** clave de `herramientas` (tema.ts) → su color; '#hex' → ese color; 'negro'/'tinta' → tinta. */
const colorDe = (color?: string) => {
  if (!color || color === 'negro' || color === 'tinta') return { fondo: c.tinta, trazo: c.papel }
  const h = herramientas[color]
  if (h) return { fondo: h.color, trazo: h.texto }
  return { fondo: color, trazo: '#fff' }
}

/** Acepta 'shopping-cart', 'ShoppingCart' o 'shoppingCart'. */
export const iconoLucide = (nombre: string): LucideIcon | null => {
  const pascal = nombre
    .split(/[-_\s]+/)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join('')
  return (icons as Record<string, LucideIcon>)[pascal] ?? null
}

export interface IconosFlotantesProps {
  /** 3–6 íconos de lucide por nombre, con color opcional por ícono. */
  iconos: IconoFlotante[]
  /** Color por defecto: clave de `herramientas` (tema.ts), hex o 'negro'. */
  color?: string
  /** Centro del elemento que rodean (px del lienzo). */
  centro?: [number, number]
  /** Radio de la órbita en px (horizontal y vertical). */
  radio?: number | [number, number]
  /** Diámetro de cada círculo. */
  tam?: number
  /** Frame en que aparece el primero. */
  desde?: number
  /** Frames entre la aparición de un ícono y el siguiente. */
  paso?: number
  /** Ángulo (grados) del primer ícono; 0 = a la derecha, -90 = arriba. */
  angulo?: number
  /** Pop sonoro en cada aparición. */
  sonido?: boolean
}

export const IconosFlotantes: React.FC<IconosFlotantesProps> = ({
  iconos, color, centro = CENTRO, radio = 340, tam = 132, desde = 0, paso = 5, angulo = -120, sonido = true,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [rx, ry] = Array.isArray(radio) ? radio : [radio, radio]
  const lista = iconos.slice(0, 6)
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {lista.map((ic, i) => {
        const nombre = typeof ic === 'string' ? ic : ic.nombre
        const col = colorDe(typeof ic === 'string' ? color : ic.color ?? color)
        const Icono = iconoLucide(nombre)
        const t0 = desde + i * paso
        const pop = spring({ frame: frame - t0, fps, config: { damping: 10, stiffness: 190, mass: 0.55 } })
        const sale = interpolate(frame, [t0, t0 + 12], [0, 1], { ...clamp, easing: ease })
        // Repartidos en la órbita con un leve desorden fijo para que no se vea de plantilla.
        const a = ((angulo + (360 / lista.length) * i + (i % 2 ? 9 : -6)) * Math.PI) / 180
        const r = 0.55 + 0.45 * sale
        const vive = Math.max(0, frame - t0)
        const fx = Math.sin(vive / 26 + i * 1.9) * 12
        const fy = Math.cos(vive / 31 + i * 1.3) * 16
        const giro = Math.sin(vive / 40 + i) * 5 + (1 - sale) * (i % 2 ? 18 : -18)
        const x = centro[0] + Math.cos(a) * rx * r + fx
        const y = centro[1] + Math.sin(a) * ry * r + fy
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: x - tam / 2,
                top: y - tam / 2,
                width: tam,
                height: tam,
                borderRadius: 999,
                background: col.fondo,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${pop}) rotate(${giro}deg)`,
                opacity: Math.min(1, pop * 2),
                boxShadow: `0 ${tam * 0.12}px ${tam * 0.32}px rgba(10,10,10,${0.16 * Math.min(1, pop)})`,
              }}
            >
              {Icono ? <Icono size={tam * 0.46} color={col.trazo} strokeWidth={2.2} /> : null}
            </div>
            {sonido ? <Sfx tipo="pop" frame={t0} volumen={0.22} /> : null}
          </React.Fragment>
        )
      })}
    </AbsoluteFill>
  )
}

// ─── 4 · Sonidos ───────────────────────────────────────────────────────────

export type TipoSfx = 'whoosh' | 'swish' | 'pop' | 'click' | 'ding'

/**
 * Efectos de @remotion/sfx (se bajan de remotion.media al renderizar). Los volúmenes
 * dejan los picos entre −14 y −20 dB: la voz (pico ≈ 0 dB) siempre queda encima.
 * 'pop' es el switch de interfaz subido de tono; 'swish' es el whip, más seco.
 * `recorte` quita el silencio inicial del archivo para que suene justo en `frame`.
 */
export const SFX: Record<TipoSfx, { src: string; volumen: number; frames: number; tono?: number; recorte?: number }> = {
  whoosh: { src: whoosh, volumen: 0.24, frames: 6 },
  swish: { src: whip, volumen: 0.2, frames: 7 },
  pop: { src: uiSwitch, volumen: 0.22, frames: 10, tono: 1.5, recorte: 2 },
  click: { src: mouseClick, volumen: 0.3, frames: 12, recorte: 6 },
  ding: { src: ding, volumen: 0.14, frames: 42 },
}

export interface SfxProps {
  tipo: TipoSfx
  /** Frame (relativo a la secuencia que lo contiene) en que suena. */
  frame: number
  /** 0–1; por defecto el de SFX[tipo]. */
  volumen?: number
}

export const Sfx: React.FC<SfxProps> = ({ tipo, frame, volumen }) => {
  const s = SFX[tipo]
  return (
    <Sequence from={Math.round(frame)} durationInFrames={s.frames} layout="none" name={`sfx-${tipo}`}>
      <Audio src={s.src} volume={volumen ?? s.volumen} toneFrequency={s.tono} trimBefore={s.recorte} />
    </Sequence>
  )
}

// ─── 5 · Destello ──────────────────────────────────────────────────────────

export interface DestelloProps {
  /** Frame del momento «listo». */
  desde: number
  /** Duración total (sube la primera mitad, se retira la segunda). */
  dur?: number
  /** 0–1: cuánto se nota. 0.6 por defecto. */
  intensidad?: number
  /** Caja del elemento que quedó listo (px del lienzo): le cruza un reflejo y suelta un aro. */
  caja?: { x: number; y: number; w: number; h: number; radio?: number }
  /** Esquina por donde entra la luz. */
  esquina?: 'arriba-derecha' | 'arriba-izquierda' | 'abajo-derecha' | 'abajo-izquierda'
  /**
   * 'css' (por defecto): leak propio con degradados, no necesita WebGL.
   * 'webgl': <LightLeak> de @remotion/light-leaks; exige renderizar con --gl=angle
   * (o Config.setChromiumOpenGlRenderer('angle')), si no, el render se cae.
   */
  motor?: 'css' | 'webgl'
  /** Forma del leak WebGL. */
  seed?: number
  /** «Ding» de listo en `desde`. */
  sonido?: boolean
}

/**
 * Luz cálida casi blanca (champán) que entra por una esquina y se retira, un reflejo que
 * cruza el elemento listo y un aro fino que sale de él. Pensado para fondo blanco: se
 * pinta con 'multiply' en tonos crema muy claros, así se nota la luz sin ensuciar.
 */
export const Destello: React.FC<DestelloProps> = ({
  desde, dur = 42, intensidad = 0.6, caja, esquina = 'arriba-derecha', motor = 'css', seed = 4, sonido = true,
}) => {
  const frame = useCurrentFrame()
  const t = frame - desde
  const brillo = interpolate(t, [2, 20], [0, 1], { ...clamp, easing: Easing.bezier(0.4, 0, 0.2, 1) })
  const aro = interpolate(t, [0, 22], [0, 1], { ...clamp, easing: ease })
  // Envolvente del leak: sube rápido y se va lento.
  const env = t < 0 || t > dur ? 0 : interpolate(t, [0, dur * 0.35, dur], [0, 1, 0], { ...clamp, easing: suave })
  const [ex, ey] = { 'arriba-derecha': [1, 0], 'arriba-izquierda': [0, 0], 'abajo-derecha': [1, 1], 'abajo-izquierda': [0, 1] }[esquina]
  const avance = interpolate(t, [0, dur], [0, 1], clamp)
  const lx = (ex ? W : 0) + (ex ? -1 : 1) * (120 + 260 * avance)
  const ly = (ey ? H : 0) + (ey ? -1 : 1) * (180 + 380 * avance)
  return (
    <>
      {motor === 'webgl' ? (
        <Sequence from={desde} durationInFrames={dur} layout="none" name="destello-webgl">
          <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'multiply', opacity: 0.4 * intensidad, filter: 'saturate(0.5) brightness(1.25)' }}>
            <LightLeak seed={seed} hueShift={0} durationInFrames={dur} />
          </AbsoluteFill>
        </Sequence>
      ) : env > 0 ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
            opacity: env * intensidad,
            background: [
              // Rayo diagonal que barre desde la esquina, más el halo grande de la fuente.
              `linear-gradient(${ex ? (ey ? 315 : 225) : ey ? 45 : 135}deg, rgba(255,255,255,0) ${18 + 30 * avance}%, rgba(255,232,198,0.55) ${30 + 30 * avance}%, rgba(255,246,232,0.35) ${38 + 30 * avance}%, rgba(255,255,255,0) ${52 + 30 * avance}%)`,
              `radial-gradient(ellipse 1100px 1500px at ${lx}px ${ly}px, rgba(255,224,182,0.7) 0%, rgba(255,240,220,0.4) 35%, rgba(255,255,255,0) 70%)`,
            ].join(', '),
          }}
        />
      ) : null}
      {caja && t >= 0 && t <= 26 ? (
        <>
          <div
            style={{
              position: 'absolute', left: caja.x, top: caja.y, width: caja.w, height: caja.h,
              borderRadius: caja.radio ?? 0, overflow: 'hidden', pointerEvents: 'none', mixBlendMode: 'screen',
            }}
          >
            <div
              style={{
                position: 'absolute', top: -caja.h, height: caja.h * 3, width: Math.max(90, caja.w * 0.22),
                left: interpolate(brillo, [0, 1], [-caja.w * 0.4, caja.w * 1.2]),
                transform: 'rotate(22deg)',
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute', pointerEvents: 'none',
              left: caja.x - 60 * aro, top: caja.y - 60 * aro, width: caja.w + 120 * aro, height: caja.h + 120 * aro,
              borderRadius: (caja.radio ?? 0) + 60 * aro, border: `${4 - 2.5 * aro}px solid ${c.tinta}`, opacity: 0.5 * (1 - aro),
            }}
          />
        </>
      ) : null}
      {sonido ? <Sfx tipo="ding" frame={desde} /> : null}
    </>
  )
}

/** Atajo: segundos → frames, para guiones escritos en segundos. */
export const seg = (s: number) => Math.round(s * FPS)
