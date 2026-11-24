import React from 'react'
import { N, p, pop, entra, hex } from '../kit'

// Piezas compartidas por las escenas del reel 001 (café). Solo las usan los archivos de esta carpeta.

/** Un color fijo por concepto en todo el reel. */
export const C = {
  cafe: '#C8895A', // el café (grano, bebida, molienda)
  crema: '#F0C9A0',
  oscuro: '#3A2416', // café en la taza
  agua: '#5AB0FF', // agua y temperatura buena
  calor: '#FF6B4A', // agua hirviendo
  ceramica: '#ECE6DE',
  ceramica2: '#C9C0B4',
}

/** Palabras del titular: `[frame, texto, color?]`. Cada una entra con pop en su frame. */
export const Titular: React.FC<{
  f: number
  lineas: [number, string, string?][][]
  size?: number
  todo?: boolean
  style?: React.CSSProperties
}> = ({ f, lineas, size = 112, todo, style }) => (
  <div
    style={{
      fontFamily: N.fTexto,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.02,
      letterSpacing: -size * 0.035,
      color: N.texto,
      ...style,
    }}
  >
    {lineas.map((l, i) => (
      <div key={i} style={{ display: 'flex', gap: size * 0.26, flexWrap: 'nowrap' }}>
        {l.map(([fr, t, col], j) => {
          const s = todo ? 1 : pop(f, fr, 12)
          const o = todo ? 1 : p(f, fr, 8)
          return (
            <span
              key={j}
              style={{
                display: 'inline-block',
                color: col ?? N.texto,
                opacity: o,
                transform: `scale(${s}) translateY(${(1 - o) * 20}px)`,
                transformOrigin: '50% 80%',
                filter: o < 1 ? `blur(${(1 - o) * 8}px)` : undefined,
                textShadow: col ? `0 0 40px ${col}${hex(0.35)}` : undefined,
              }}
            >
              {t}
            </span>
          )
        })}
      </div>
    ))}
  </div>
)

/** Vapor: tres cintas onduladas que suben (función del frame). `fuerza` 0–1.5. */
export const Vapor: React.FC<{ f: number; x: number; y: number; ancho?: number; fuerza?: number; color?: string }> = ({
  f,
  x,
  y,
  ancho = 200,
  fuerza = 1,
  color = '#FFFFFF',
}) => {
  const cintas = [0, 1, 2]
  return (
    <svg width={ancho} height={260} viewBox={`0 0 ${ancho} 260`} style={{ position: 'absolute', left: x - ancho / 2, top: y - 260, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`vapor-${x}-${y}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity={0.55 * Math.min(1, fuerza)} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {cintas.map((k) => {
        const cx = ancho * (0.25 + k * 0.25)
        const fase = f / 9 + k * 2.1
        const amp = 14 * fuerza
        const d = Array.from({ length: 13 }, (_, i) => {
          const yy = 250 - i * 20
          const xx = cx + Math.sin(fase - i * 0.55) * amp * (0.4 + i / 13)
          return `${i === 0 ? 'M' : 'L'} ${xx.toFixed(1)} ${yy}`
        }).join(' ')
        return (
          <path
            key={k}
            d={d}
            fill="none"
            stroke={`url(#vapor-${x}-${y})`}
            strokeWidth={10 + 4 * fuerza}
            strokeLinecap="round"
            opacity={0.6 + 0.4 * Math.sin(f / 13 + k)}
          />
        )
      })}
    </svg>
  )
}

/** Taza de cerámica de lado. x,y = esquina superior izquierda del cuerpo; `tono` 0 normal → 1 quemado. */
export const Taza: React.FC<{ x: number; y: number; w?: number; tono?: number; nivel?: number }> = ({ x, y, w = 320, tono = 0, nivel = 1 }) => {
  const h = w * 0.86
  const cafe = mezclaHex(C.oscuro, '#1A0D06', tono)
  return (
    <svg width={w * 1.4} height={h + 40} viewBox={`0 0 ${w * 1.4} ${h + 40}`} style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }}>
      {/* asa */}
      <path
        d={`M ${w * 0.95} ${h * 0.22} C ${w * 1.36} ${h * 0.16}, ${w * 1.36} ${h * 0.7}, ${w * 0.9} ${h * 0.68}`}
        fill="none"
        stroke={C.ceramica2}
        strokeWidth={w * 0.09}
        strokeLinecap="round"
      />
      {/* platillo */}
      <ellipse cx={w * 0.5} cy={h + 14} rx={w * 0.68} ry={w * 0.07} fill={C.ceramica2} />
      <ellipse cx={w * 0.5} cy={h + 8} rx={w * 0.6} ry={w * 0.05} fill={C.ceramica} />
      {/* cuerpo */}
      <path d={`M 0 0 L ${w} 0 L ${w * 0.9} ${h * 0.86} Q ${w * 0.86} ${h} ${w * 0.7} ${h} L ${w * 0.3} ${h} Q ${w * 0.14} ${h} ${w * 0.1} ${h * 0.86} Z`} fill={C.ceramica} />
      <path d={`M ${w * 0.68} 0 L ${w} 0 L ${w * 0.9} ${h * 0.86} Q ${w * 0.86} ${h} ${w * 0.7} ${h} L ${w * 0.62} ${h} Z`} fill={C.ceramica2} opacity={0.55} />
      {/* boca y café */}
      <ellipse cx={w * 0.5} cy={0} rx={w * 0.5} ry={w * 0.09} fill={C.ceramica2} />
      <ellipse cx={w * 0.5} cy={w * 0.012 * (1 - nivel) + 4} rx={w * 0.46} ry={w * 0.072} fill={cafe} />
      <ellipse cx={w * 0.42} cy={2} rx={w * 0.18} ry={w * 0.022} fill={C.crema} opacity={0.35 * (1 - tono)} />
    </svg>
  )
}

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
export const mezclaHex = (a: string, b: string, t: number) =>
  '#' +
  rgb(a)
    .map((v, i) => Math.round(v + (rgb(b)[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0'))
    .join('')

/** Sello redondeado con texto (pop). */
export const Sello: React.FC<{ f: number; en: number; texto: string; color: string; size?: number; giro?: number; style?: React.CSSProperties }> = ({
  f,
  en,
  texto,
  color,
  size = 44,
  giro = -6,
  style,
}) => {
  if (f < en) return null
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: `${size * 0.22}px ${size * 0.5}px`,
        borderRadius: 16,
        border: `4px solid ${color}`,
        color,
        background: `${color}${hex(0.12)}`,
        fontFamily: N.fTexto,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: -0.5,
        textTransform: 'uppercase',
        transform: `rotate(${giro}deg) scale(${pop(f, en, 10)})`,
        opacity: p(f, en, 6),
        boxShadow: `0 0 40px ${color}${hex(0.3)}`,
        ...style,
      }}
    >
      {texto}
    </div>
  )
}

/** Etiqueta mono pequeña de UI (≥ 34 px para que se lea en celular). */
export const Etiqueta: React.FC<{ f: number; en: number; texto: string; color?: string; style?: React.CSSProperties }> = ({ f, en, texto, color = N.texto2, style }) => (
  <div style={{ fontFamily: N.fMono, fontWeight: 700, fontSize: 34, letterSpacing: 3, color, textTransform: 'uppercase', ...entra(f, en, 10, 12), ...style }}>{texto}</div>
)
