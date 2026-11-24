import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { N, Kicker, Tarjeta, p, pop, entra, enEscena, deriva, mezcla, hex } from '../kit'
import type { TipoSonido } from '../sonido'
import { C, Titular, Vapor, Taza } from './comun'

// S1 · Gancho — t0 0,00 · t1 4,40 (132 f). El cuadro 0 ya es el gancho completo.
const T0 = 0
const T = (s: number) => enEscena(s, T0)
export const DUR_S1 = 132

const F = { amargo: T(1.5), no: T(1.99), grano: T(2.68), tres: T(3.33) }

export const SFX_S1: { f: number; tipo: TipoSonido; vol?: number }[] = [
  { f: F.amargo, tipo: 'error' },
  { f: F.no, tipo: 'swish' },
  { f: F.grano + 4, tipo: 'impacto', vol: 0.09 },
  { f: F.tres, tipo: 'pop' },
  { f: F.tres + 6, tipo: 'pop' },
  { f: F.tres + 12, tipo: 'pop' },
]

/** Medidor semicircular SUAVE → AMARGO; `v` 0–1. */
const Medidor: React.FC<{ v: number; f: number }> = ({ v, f }) => {
  const R = 130
  const cx = 170
  const cy = 160
  const tramos = [
    { a0: 180, a1: 240, col: N.ok },
    { a0: 240, a1: 300, col: N.meta },
    { a0: 300, a1: 360, col: N.rojo },
  ]
  const arco = (a0: number, a1: number) => {
    const r = (a: number) => (a * Math.PI) / 180
    return `M ${cx + R * Math.cos(r(a0))} ${cy + R * Math.sin(r(a0))} A ${R} ${R} 0 0 1 ${cx + R * Math.cos(r(a1))} ${cy + R * Math.sin(r(a1))}`
  }
  const temblor = Math.sin(f * 2.3) * 2.2 * (v > 0.85 ? 1 : 0)
  const ang = 180 + v * 172 + temblor
  return (
    <svg width={340} height={190} viewBox="0 0 340 190">
      {tramos.map((t) => (
        <path key={t.a0} d={arco(t.a0 + 2, t.a1 - 2)} stroke={t.col} strokeWidth={26} fill="none" strokeLinecap="round" opacity={0.9} />
      ))}
      <g transform={`rotate(${ang} ${cx} ${cy})`}>
        <line x1={cx} y1={cy} x2={cx + R - 26} y2={cy} stroke={N.texto} strokeWidth={9} strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={16} fill={N.texto} />
    </svg>
  )
}

/** Grano de café propio (SVG). */
const Grano: React.FC<{ size?: number }> = ({ size = 110 }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100">
    <ellipse cx={0} cy={0} rx={30} ry={42} fill={C.cafe} transform="rotate(-24)" />
    <path d="M -4 -40 C 14 -16, -16 14, 4 40" stroke="#5A3520" strokeWidth={7} fill="none" strokeLinecap="round" transform="rotate(-24)" />
  </svg>
)

const FICHAS = ['Agua', 'Molienda', 'Medida']

export const S1Gancho: React.FC<{ portada?: boolean }> = ({ portada }) => {
  const actual = useCurrentFrame()
  const f = portada ? 0 : actual
  const zoom = mezcla(1, 1.04, interpolate(f, [0, DUR_S1], [0, 1], { extrapolateRight: 'clamp' }))
  const d = deriva(f, 1, 4)

  // aguja: ya en amargo desde el cuadro 0; en «amargo» retrocede y golpea el rojo
  const golpe = p(f, F.amargo - 8, 8) * (1 - p(f, F.amargo, 10))
  const v = 0.92 - 0.3 * golpe + 0.06 * Math.max(0, Math.sin(Math.min(1, (f - F.amargo) / 10) * Math.PI)) * (f >= F.amargo ? 1 : 0)
  const tono = p(f, F.amargo, 16) * 0.6
  const flash = f >= F.amargo ? 1 - p(f, F.amargo, 18) : 0

  const tachar = p(f, F.grano + 4, 10)

  return (
    <AbsoluteFill style={{ transform: `translate(${d.x}px, ${d.y}px) scale(${zoom})`, transformOrigin: '510px 800px' }}>
      <div style={{ position: 'absolute', left: 80, top: 252 }}>
        <Kicker texto="Café en casa" color={C.cafe} />
      </div>
      <Titular
        f={f}
        todo
        size={118}
        style={{ position: 'absolute', left: 76, top: 316 }}
        lineas={[
          [
            [0, '3', N.meta],
            [0, 'errores'],
            [0, 'que'],
          ],
          [
            [0, 'arruinan'],
            [0, 'tu'],
            [0, 'café', C.crema],
          ],
        ]}
      />

      {/* taza */}
      <div style={{ position: 'absolute', left: 0, top: 0 }}>
        <div
          style={{
            position: 'absolute',
            left: 170,
            top: 790,
            width: 360,
            height: 360,
            borderRadius: 999,
            background: `radial-gradient(circle, ${C.cafe}${hex(0.35)}, transparent 70%)`,
            filter: 'blur(10px)',
          }}
        />
        <Vapor f={f} x={270} y={850} ancho={230} fuerza={1.1} />
        <Taza x={120} y={860} w={300} tono={tono} />
      </div>

      {/* tarjeta Sabor */}
      <div style={{ position: 'absolute', left: 540, top: 640, transform: `translateX(${Math.sin(f * 1.7) * 6 * flash}px)` }}>
        <Tarjeta glow={N.rojo} fuerza={0.5 + 0.6 * flash} style={{ width: 400, padding: '26px 30px 22px', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: N.fMono, fontWeight: 700, fontSize: 34, letterSpacing: 5, color: N.texto2, textTransform: 'uppercase' }}>Sabor</div>
          <div style={{ marginLeft: -6, marginTop: 6 }}>
            <Medidor v={v} f={f} />
          </div>
          <div
            style={{
              textAlign: 'center',
              fontFamily: N.fTexto,
              fontWeight: 900,
              fontSize: 64,
              letterSpacing: -1.5,
              color: N.rojo,
              transform: `scale(${f >= F.amargo ? pop(f, F.amargo, 12) : 1})`,
              textShadow: `0 0 ${20 + 30 * flash}px ${N.rojo}${hex(0.5)}`,
            }}
          >
            AMARGO
          </div>
        </Tarjeta>
      </div>

      {/* No es el grano */}
      {f >= F.no ? (
        <div style={{ position: 'absolute', left: 556, top: 1012, display: 'flex', alignItems: 'center', gap: 18, ...entra(f, F.no, 12, 20) }}>
          <div style={{ position: 'relative', width: 110, height: 110 }}>
            <Grano />
            <svg width={120} height={120} viewBox="0 0 120 120" style={{ position: 'absolute', left: -5, top: -5 }}>
              <line x1={10} y1={110} x2={10 + 100 * tachar} y2={110 - 100 * tachar} stroke={N.rojo} strokeWidth={11} strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontFamily: N.fTexto, fontWeight: 800, fontSize: 42, lineHeight: 1.05, letterSpacing: -0.8, color: N.texto }}>
            No es el
            <br />
            <span style={{ color: C.cafe }}>grano</span>
          </div>
        </div>
      ) : null}

      {/* fichas de los 3 errores */}
      <div style={{ position: 'absolute', left: 80, top: 1168, display: 'flex', gap: 22 }}>
        {FICHAS.map((t, i) => {
          const en = F.tres + i * 6
          if (f < en) return null
          return (
            <div
              key={t}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '10px 24px 10px 12px',
                borderRadius: 999,
                background: N.tarjeta2,
                border: `2px solid ${N.meta}${hex(0.55)}`,
                transform: `scale(${pop(f, en, 12)})`,
                opacity: p(f, en, 6),
                fontFamily: N.fTexto,
                fontWeight: 800,
                fontSize: 38,
                color: N.texto,
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: N.meta,
                  color: N.fondo,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: N.fMono,
                  fontSize: 30,
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </span>
              {t}
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
