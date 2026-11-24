import React from 'react'
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { loadFont as loadInterTight } from '@remotion/google-fonts/InterTight'
import { loadFont as loadJetBrains } from '@remotion/google-fonts/JetBrainsMono'

import { ease } from '../tema'

// Tabla comparativa que se destapa celda por celda (estilo «reveal»): cada fila entra con sus dos celdas borrosas, un barrido las destapa,
// las cifras cuentan hasta su valor y a la ganadora se le dibuja un recuadro
// amarillo con glow. Al final, marcador grande con pop y la tarjeta del veredicto.
// Paleta propia «Noche de laboratorio» (no usa la del estilo activo).

const inter = loadInterTight('normal', { weights: ['500', '600', '700', '800', '900'], subsets: ['latin'] })
const jet = loadJetBrains('normal', { weights: ['500', '700', '800'], subsets: ['latin'] })

export const noche = {
  fondo: '#0B0B0F',
  tarjeta: '#14141B',
  linea: '#26262F',
  texto: '#F5F5F7',
  texto2: '#9A9AA8',
  amarillo: '#FFD166',
  fTexto: inter.fontFamily,
  fMono: jet.fontFamily,
}

export interface HerramientaTabla {
  nombre: string
  color: string
}

export interface FilaTabla {
  criterio: string
  /** Valor de la celda; los números se animan con contador («US$2.932», «61 h 47 min»). Vacío = ✓ / — */
  a?: string
  b?: string
  gana: 'a' | 'b' | 'empate'
  /** Frame en que se destapa la fila (la fila entra ~14 frames antes). */
  t: number
}

export interface TablaRevelaProps {
  a: HerramientaTabla
  b: HerramientaTabla
  filas: FilaTabla[]
  /** Texto del marcador, p. ej. «3 – 1». Lo de cada lado del guion toma el color de su herramienta. */
  marcador: string
  veredicto: string
  /** Frame en que hace pop el marcador y entra el veredicto. */
  tVeredicto: number
  /** Frame en que entra la cabecera. */
  desde?: number
  /** Fondo propio (oscuro + glow + grano). Ponlo en false si la escena ya pinta el fondo. */
  fondo?: boolean
}

// Zona útil del 9:16: x 70–950, y 240–1240.
const X0 = 70
const ANCHO = 880
const Y0 = 250
const COL_CRIT = 300
const COL = (ANCHO - COL_CRIT) / 2
const CAB = 132
const ALTO_TABLA_MAX = 720

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const p01 = (frame: number, desde: number, dur: number) => interpolate(frame, [desde, desde + dur], [0, 1], { ...clamp, easing: ease })

/** Cuenta cada número del texto hacia su valor, conservando el formato («2.932», «5 h 32 min»). */
const contar = (texto: string, p: number) =>
  texto.replace(/\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?/g, (tok) => {
    const miles = /^\d{1,3}(?:[.,]\d{3})+$/.test(tok)
    if (miles) {
      const sep = tok.includes('.') ? '.' : ','
      const n = Math.round(Number(tok.replace(/[.,]/g, '')) * p)
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep)
    }
    const dec = tok.match(/[.,](\d+)$/)
    const sep = tok.includes(',') ? ',' : '.'
    const v = Number(tok.replace(',', '.')) * p
    const s = dec ? v.toFixed(dec[1].length) : Math.round(v).toString()
    return sep === ',' ? s.replace('.', ',') : s
  })

const Grano: React.FC<{ frame: number; opacidad?: number }> = ({ frame, opacidad = 0.05 }) => {
  const semilla = Math.floor(random(`grano-${Math.floor(frame / 2)}`) * 1000)
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: opacidad, mixBlendMode: 'screen', pointerEvents: 'none' }}>
      <filter id={`g${semilla}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={semilla} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${semilla})`} />
    </svg>
  )
}

/** Palomita dibujada en SVG (se ve igual en cualquier máquina, sin emoji). */
const Check: React.FC<{ tam: number; color: string; p?: number; grosor?: number }> = ({ tam, color, p = 1, grosor = 3 }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" style={{ overflow: 'visible', filter: `drop-shadow(0 0 10px ${color}66)` }}>
    <path d="M4.5 12.5 L9.8 17.5 L19.5 6.5" fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
  </svg>
)

/** Recuadro que se dibuja alrededor de la celda ganadora (trazo SVG + glow). */
const Recuadro: React.FC<{ w: number; h: number; p: number; color: string }> = ({ w, h, p, color }) => {
  const m = 10
  return (
    <svg width={w + m * 2} height={h + m * 2} style={{ position: 'absolute', left: -m, top: -m, overflow: 'visible', pointerEvents: 'none' }}>
      <rect
        x={m} y={m} width={w} height={h} rx={18}
        fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p}
        style={{ filter: `drop-shadow(0 0 ${10 * p}px ${color}AA) drop-shadow(0 0 ${26 * p}px ${color}55)` }}
      />
    </svg>
  )
}

const Celda: React.FC<{
  frame: number
  fps: number
  valor?: string
  gana: boolean
  empate: boolean
  color: string
  tRevela: number
  ancho: number
  alto: number
  semilla: string
}> = ({ frame, fps, valor, gana, empate, color, tRevela, ancho, alto, semilla }) => {
  const barrido = p01(frame, tRevela, 11) // 0 → 1: el velo se va de izquierda a derecha
  const cuenta = p01(frame, tRevela + 2, 22)
  const dibujo = p01(frame, tRevela + 20, 16)
  const marca = spring({ frame: frame - (tRevela + 30), fps, config: { damping: 11, stiffness: 180 } })
  const brillo = interpolate((frame + random(semilla) * 40) % 40, [0, 40], [-0.4, 1.4])

  const w = ancho - 28
  const h = alto - 30
  const vacio = !valor
  const texto = vacio ? (gana || empate ? '✓' : '—') : contar(valor, cuenta)
  const largo = (valor || '').length
  const cuerpo = vacio ? 64 : Math.min(58, Math.floor((w - 24) / (largo * 0.62)))
  const colorTexto = gana ? noche.texto : empate ? noche.texto : noche.texto2

  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {/* El valor, que queda debajo del velo */}
      <div
        style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: vacio ? noche.fTexto : noche.fMono, fontWeight: 800, fontSize: cuerpo,
          letterSpacing: '-0.03em', color: vacio && gana ? color : colorTexto, whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
          clipPath: `inset(0 ${(1 - barrido) * 100}% 0 0)`,
          textShadow: gana ? `0 0 24px ${color}44` : 'none',
        }}
      >
        {vacio && (gana || empate) ? <Check tam={68} color={gana ? color : noche.texto2} p={barrido} /> : texto}
      </div>
      {/* El velo: bloque borroso con un brillo que lo recorre */}
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden',
          clipPath: `inset(0 0 0 ${barrido * 100}%)`,
          background: noche.linea,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, filter: 'blur(9px)' }}>
          {[0.42, 0.22, 0.3].map((f, i) => (
            <div key={i} style={{ width: w * f, height: 34, borderRadius: 10, background: i === 1 ? `${color}88` : '#4A4A58' }} />
          ))}
        </div>
        <div
          style={{
            position: 'absolute', top: 0, bottom: 0, width: '45%', left: `${brillo * 100 - 22}%`,
            background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.13), transparent)',
          }}
        />
        {/* Borde brillante del barrido */}
        {barrido > 0 && barrido < 1 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: noche.amarillo, boxShadow: `0 0 18px ${noche.amarillo}` }} />}
      </div>
      {gana && <Recuadro w={w} h={h} p={dibujo} color={noche.amarillo} />}
      {empate && <Recuadro w={w} h={h} p={dibujo} color={noche.texto2} />}
      {gana && !vacio && (
        <div
          style={{
            position: 'absolute', right: -14, top: -16, width: 44, height: 44, borderRadius: 22,
            background: color, color: '#0B0B0F', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: noche.fTexto, fontWeight: 900, fontSize: 28, transform: `scale(${marca})`,
            boxShadow: `0 0 0 4px ${noche.tarjeta}, 0 0 20px ${color}88`,
          }}
        >
          <Check tam={26} color="#0B0B0F" grosor={4.5} />
        </div>
      )}
    </div>
  )
}

export const TablaRevela: React.FC<TablaRevelaProps> = ({ a, b, filas, marcador, veredicto, tVeredicto, desde = 0, fondo = true }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const altoFila = Math.min(156, Math.floor((ALTO_TABLA_MAX - CAB) / Math.max(1, filas.length)))
  const altoTabla = CAB + altoFila * filas.length
  const cab = p01(frame, desde, 14)

  // Marcador y veredicto
  const pop = spring({ frame: frame - tVeredicto, fps, config: { damping: 9, stiffness: 160, mass: 0.8 } })
  const tarjeta = p01(frame, tVeredicto + 8, 16)
  const yFinal = Y0 + altoTabla + 28
  const [ladoA, ladoB] = marcador.split(/\s*[–-]\s*/)
  const ganaA = Number(ladoA) > Number(ladoB)
  const colorGana = ganaA ? a.color : b.color
  const atenua = interpolate(frame, [tVeredicto, tVeredicto + 12], [1, 0.8], clamp)

  return (
    <AbsoluteFill style={{ fontFamily: noche.fTexto, color: noche.texto }}>
      {fondo && (
        <AbsoluteFill
          style={{
            background: [
              `radial-gradient(700px 520px at 20% 22%, ${a.color}1F, transparent 70%)`,
              `radial-gradient(700px 520px at 85% 30%, ${b.color}1A, transparent 70%)`,
              `radial-gradient(900px 600px at 50% ${interpolate(frame, [tVeredicto, tVeredicto + 20], [110, 62], clamp)}%, ${colorGana}${frame >= tVeredicto ? '22' : '00'}, transparent 70%)`,
              noche.fondo,
            ].join(', '),
          }}
        />
      )}

      {/* Tabla */}
      <div
        style={{
          position: 'absolute', left: X0, top: Y0, width: ANCHO, height: altoTabla,
          background: noche.tarjeta, border: `2px solid ${noche.linea}`, borderRadius: 30,
          boxShadow: '0 30px 90px rgba(0,0,0,0.55)',
          opacity: cab, transform: `translateY(${(1 - cab) * 30}px)`, filter: `blur(${(1 - cab) * 10}px)`,
        }}
      >
        {/* Cabecera */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: ANCHO, height: CAB, display: 'flex', borderBottom: `2px solid ${noche.linea}` }}>
          <div style={{ width: COL_CRIT, display: 'flex', alignItems: 'center', paddingLeft: 34, fontFamily: noche.fMono, fontSize: 22, letterSpacing: '0.14em', color: noche.texto2, fontWeight: 700 }}>
            CRITERIO
          </div>
          {[a, b].map((h, i) => {
            const p = p01(frame, desde + 6 + i * 5, 14)
            return (
              <div key={h.nombre} style={{ width: COL, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderLeft: `2px solid ${noche.linea}`, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: h.color, boxShadow: `0 0 16px ${h.color}` }} />
                  <div style={{ fontWeight: 800, fontSize: h.nombre.length > 10 ? 38 : 42, letterSpacing: '-0.03em', color: h.color, whiteSpace: 'nowrap' }}>{h.nombre}</div>
                </div>
                <div style={{ position: 'absolute', bottom: -2, left: '50%', height: 5, width: `${p * 70}%`, transform: 'translateX(-50%)', background: h.color, borderRadius: 3, boxShadow: `0 0 14px ${h.color}` }} />
              </div>
            )
          })}
        </div>

        {/* Filas */}
        {filas.map((fila, i) => {
          const entrada = p01(frame, fila.t - 14, 13)
          const activa = interpolate(frame, [fila.t - 14, fila.t, fila.t + 40, fila.t + 60], [0, 1, 1, 0], clamp)
          return (
            <div
              key={fila.criterio}
              style={{
                position: 'absolute', left: 0, top: CAB + i * altoFila, width: ANCHO, height: altoFila, display: 'flex',
                borderTop: i === 0 ? 'none' : `2px solid ${noche.linea}`,
                background: `rgba(255,255,255,${0.025 * activa})`,
                opacity: entrada * (frame >= tVeredicto ? atenua : 1),
                transform: `translateY(${(1 - entrada) * 24}px)`, filter: `blur(${(1 - entrada) * 8}px)`,
              }}
            >
              <div style={{ width: COL_CRIT, display: 'flex', alignItems: 'center', paddingLeft: 34, paddingRight: 18, fontWeight: 700, fontSize: fila.criterio.length > 18 ? 34 : 38, lineHeight: 1.08, letterSpacing: '-0.02em' }}>
                {fila.criterio}
              </div>
              {(['a', 'b'] as const).map((lado, j) => (
                <div key={lado} style={{ width: COL, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: `2px solid ${noche.linea}` }}>
                  <Celda
                    frame={frame} fps={fps} valor={fila[lado]} semilla={`${i}-${lado}`}
                    gana={fila.gana === lado} empate={fila.gana === 'empate'}
                    color={lado === 'a' ? a.color : b.color}
                    tRevela={fila.t + j * 6} ancho={COL} alto={altoFila}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Marcador + veredicto */}
      {frame >= tVeredicto - 1 && (
        <div style={{ position: 'absolute', left: X0, top: yFinal, width: ANCHO, height: 1240 - yFinal, display: 'flex', gap: 24, alignItems: 'stretch' }}>
          <div
            style={{
              width: 340, borderRadius: 30, background: noche.tarjeta, border: `2px solid ${noche.linea}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
              fontFamily: noche.fMono, fontWeight: 800, fontSize: 132, letterSpacing: '-0.06em',
              transform: `scale(${interpolate(pop, [0, 1], [0.4, 1])})`, opacity: Math.min(1, pop * 2),
              boxShadow: `0 0 60px ${colorGana}33`,
            }}
          >
            <span style={{ color: a.color, textShadow: `0 0 30px ${a.color}66` }}>{ladoA}</span>
            <span style={{ color: noche.texto2, fontSize: 90 }}>–</span>
            <span style={{ color: b.color, textShadow: `0 0 30px ${b.color}66` }}>{ladoB}</span>
          </div>
          <div
            style={{
              flex: 1, borderRadius: 30, background: noche.tarjeta, border: `2px solid ${colorGana}`,
              boxShadow: `0 0 40px ${colorGana}44, inset 0 0 60px ${colorGana}14`,
              padding: '0 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
              opacity: tarjeta, transform: `translateX(${(1 - tarjeta) * 40}px)`, filter: `blur(${(1 - tarjeta) * 10}px)`,
            }}
          >
            <div style={{ fontFamily: noche.fMono, fontSize: 22, fontWeight: 700, letterSpacing: '0.14em', color: noche.amarillo }}>VEREDICTO</div>
            <div style={{ fontWeight: 800, fontSize: veredicto.length > 26 ? 44 : 52, lineHeight: 1.06, letterSpacing: '-0.03em' }}>{veredicto}</div>
          </div>
        </div>
      )}

      {fondo && <Grano frame={frame} opacidad={0.05} />}
    </AbsoluteFill>
  )
}
