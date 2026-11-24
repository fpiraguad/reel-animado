import React from 'react'
import { interpolate, spring, useCurrentFrame } from 'remotion'
import { icons } from 'lucide-react'

import { f, FPS, prog } from '../tema'

// ─── AppSeArma ─────────────────────────────────────────────────────────────
// Una pantalla de celular que se construye sola, como si una IA la generara:
// esqueleto gris con brillo → cada bloque se materializa en orden con su
// contenido y su color → el botón hace «pop» → destello de «lista».
// Data-driven: la app entera viene en `app`. La app es el «producto», así que
// tiene color propio y esquinas redondeadas (no sigue el radio 0 del Suizo).

export type NombreIcono = keyof typeof icons

export type BloqueApp =
  | { tipo: 'saludo'; titulo: string; sub?: string }
  | { tipo: 'stat'; etiqueta: string; valor: string; cambio?: string; icono?: NombreIcono }
  | { tipo: 'tarjetas'; items: { etiqueta: string; valor: string; icono?: NombreIcono; emoji?: string }[] }
  | {
      tipo: 'lista'
      titulo?: string
      accion?: string
      items: { titulo: string; sub?: string; valor?: string; emoji?: string; alerta?: string }[]
    }
  | { tipo: 'grafico'; titulo?: string; forma?: 'barras' | 'linea'; valores: number[]; etiquetas?: string[]; resaltar?: number; marca?: string; total?: string }
  | { tipo: 'calendario'; titulo?: string; dias?: { d: string; n: number }[]; activo?: number; citas: { hora: string; nombre: string; servicio?: string }[] }
  | { tipo: 'boton'; texto: string; icono?: NombreIcono }

export interface AppDef {
  nombre: string
  sub?: string
  color: string // hex #RRGGBB: color de marca de la app
  emoji?: string
  icono?: NombreIcono // si no hay emoji
  bloques: BloqueApp[]
}

export interface AppSeArmaProps {
  app: AppDef
  desde?: number // frame en que aparece el celular
  ritmo?: number // frames entre bloques (barra superior incluida)
  soloFinal?: boolean // pintarla ya armada, sin animación
  escala?: number // 1 = 390×800 px
  estilo?: React.CSSProperties
}

const ANCHO = 390
const ALTO = 800
const T_PRIMERO = 16 // frames desde `desde` hasta que se materializa la barra superior

/** Frames que tarda la app en quedar armada (incluido el destello), desde `desde`. */
export const duracionAppSeArma = (app: AppDef, ritmo = 12) => T_PRIMERO + app.bloques.length * ritmo + 30

// ─── utilidades ────────────────────────────────────────────────────────────
const alfa = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
const oscuro = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return l < 165
}

const TINTA = '#111318'
const GRIS = '#6B7280'
const FONDO = '#F4F5F8'
const ESQ = '#E6E8EE'
const SOMBRA = '0 1px 2px rgba(16,24,40,.05), 0 6px 18px rgba(16,24,40,.07)'

const Icono: React.FC<{ n?: NombreIcono; tam: number; color: string; grosor?: number }> = ({ n, tam, color, grosor = 2.2 }) => {
  const I = n ? icons[n] : undefined
  return I ? <I size={tam} color={color} strokeWidth={grosor} /> : null
}

// Contexto de animación que comparten los bloques.
interface Ctx {
  t: number // frames desde que se materializa ESTE bloque (negativo = aún esqueleto)
  color: string
  sobreColor: string
}

const aparece = (t: number, retraso = 0, dur = 10, dy = 14) => {
  const p = prog(t, retraso, dur)
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: `blur(${(1 - p) * 6}px)` }
}

// ─── esqueleto ─────────────────────────────────────────────────────────────
const Hueso: React.FC<{ w: number | string; h: number | string; r?: number; brillo: number; estilo?: React.CSSProperties }> = ({ w, h, r = 8, brillo, estilo }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: r,
      background: ESQ,
      backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.85) 50%, rgba(255,255,255,0) 65%)',
      backgroundSize: '300% 100%',
      backgroundPosition: `${brillo}% 0`,
      flexShrink: 0,
      ...estilo,
    }}
  />
)

const Esqueleto: React.FC<{ b: BloqueApp; brillo: number }> = ({ b, brillo }) => {
  const H = (p: { w: number | string; h: number | string; r?: number; estilo?: React.CSSProperties }) => <Hueso {...p} brillo={brillo} />
  const caja: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 10 }
  switch (b.tipo) {
    case 'saludo':
      return <div style={{ ...caja, justifyContent: 'center' }}><H w="70%" h={24} /><H w="48%" h={14} /></div>
    case 'stat':
      return <div style={caja}><H w="100%" h="100%" r={20} /></div>
    case 'boton':
      return <div style={caja}><H w="100%" h="100%" r={16} /></div>
    case 'tarjetas':
      return (
        <div style={{ ...caja, flexDirection: 'row' }}>
          {b.items.map((_, i) => <H key={i} w="100%" h="100%" r={18} estilo={{ flex: 1 }} />)}
        </div>
      )
    case 'grafico':
      return <div style={caja}><H w="100%" h="100%" r={20} /></div>
    case 'lista':
    case 'calendario': {
      const filas = b.tipo === 'lista' ? b.items.length : b.citas.length
      return (
        <div style={caja}>
          <H w="42%" h={16} />
          {b.tipo === 'calendario' && <H w="100%" h={64} r={16} />}
          {Array.from({ length: filas }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, height: b.tipo === 'lista' ? 52 : 56 }}>
              <H w={42} h={42} r={12} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <H w="62%" h={13} />
                <H w="38%" h={10} />
              </div>
            </div>
          ))}
        </div>
      )
    }
  }
}

// ─── bloques reales ────────────────────────────────────────────────────────
const tarjeta: React.CSSProperties = { background: '#fff', borderRadius: 20, boxShadow: SOMBRA, padding: 16 }

const Saludo: React.FC<{ b: Extract<BloqueApp, { tipo: 'saludo' }>; x: Ctx }> = ({ b, x }) => (
  <div style={{ padding: '4px 2px' }}>
    <div style={{ ...aparece(x.t), fontSize: 25, fontWeight: 800, letterSpacing: -0.6, color: TINTA }}>{b.titulo}</div>
    {b.sub && <div style={{ ...aparece(x.t, 3), fontSize: 14.5, color: GRIS, marginTop: 3, fontWeight: 500 }}>{b.sub}</div>}
  </div>
)

/** Cuenta el número que haya dentro del texto («$1.240.000» → 0…1.240.000) con separador de miles. */
const cuenta = (valor: string, p: number) =>
  valor.replace(/\d[\d.,]*/, (m) => {
    const n = Number(m.replace(/[.,]/g, ''))
    if (!Number.isFinite(n)) return m
    return Math.round(n * p).toLocaleString('es-CO').replace(/,/g, '.')
  })

const Stat: React.FC<{ b: Extract<BloqueApp, { tipo: 'stat' }>; x: Ctx }> = ({ b, x }) => {
  const p = prog(x.t, 2, 26)
  return (
    <div
      style={{
        ...aparece(x.t, 0, 10, 10),
        borderRadius: 22,
        padding: '18px 18px 16px',
        color: x.sobreColor,
        background: `linear-gradient(135deg, ${x.color} 0%, ${alfa(x.color, 0.82)} 100%)`,
        boxShadow: `0 10px 26px ${alfa(x.color, 0.35)}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', right: -40, top: -50, width: 160, height: 160, borderRadius: 999, background: 'rgba(255,255,255,.12)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, opacity: 0.9 }}>
        <Icono n={b.icono ?? 'TrendingUp'} tam={16} color={x.sobreColor} />
        {b.etiqueta}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.2, fontVariantNumeric: 'tabular-nums' }}>{cuenta(b.valor, p)}</div>
        {b.cambio && (
          <div style={{ ...aparece(x.t, 18), fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,.22)', borderRadius: 999, padding: '3px 9px' }}>{b.cambio}</div>
        )}
      </div>
    </div>
  )
}

const Tarjetas: React.FC<{ b: Extract<BloqueApp, { tipo: 'tarjetas' }>; x: Ctx }> = ({ b, x }) => (
  <div style={{ display: 'flex', gap: 10 }}>
    {b.items.map((it, i) => (
      <div key={i} style={{ ...tarjeta, ...aparece(x.t, i * 3), flex: 1, padding: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: alfa(x.color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          {it.emoji ?? <Icono n={it.icono ?? 'Sparkles'} tam={18} color={x.color} />}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: TINTA, marginTop: 10, letterSpacing: -0.5 }}>{it.valor}</div>
        <div style={{ fontSize: 12.5, color: GRIS, fontWeight: 500 }}>{it.etiqueta}</div>
      </div>
    ))}
  </div>
)

const Cabecera: React.FC<{ titulo?: string; accion?: string; x: Ctx }> = ({ titulo, accion, x }) =>
  titulo ? (
    <div style={{ ...aparece(x.t), display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
      <div style={{ fontSize: 16.5, fontWeight: 750, color: TINTA, letterSpacing: -0.2 }}>{titulo}</div>
      {accion && <div style={{ fontSize: 13, fontWeight: 650, color: x.color }}>{accion}</div>}
    </div>
  ) : null

const ROJO = '#E5484D'

const Lista: React.FC<{ b: Extract<BloqueApp, { tipo: 'lista' }>; x: Ctx }> = ({ b, x }) => (
  <div>
    <Cabecera titulo={b.titulo} accion={b.accion} x={x} />
    <div style={{ ...tarjeta, ...aparece(x.t, 1, 10, 8), padding: '4px 14px' }}>
      {b.items.map((it, i) => {
        const a = aparece(x.t, 3 + i * 3)
        const latido = it.alerta ? 1 + 0.06 * Math.max(0, Math.sin(((x.t - 16 - i * 3) / FPS) * Math.PI * 2.2)) * (x.t > 16 + i * 3 ? 1 : 0) : 1
        return (
          <div key={i} style={{ ...a, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid #EEF0F3' : 'none' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: it.alerta ? alfa(ROJO, 0.1) : FONDO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>
              {it.emoji ?? '•'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 650, color: TINTA, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.titulo}</div>
              {it.sub && <div style={{ fontSize: 12.5, color: GRIS, marginTop: 1 }}>{it.sub}</div>}
            </div>
            {it.alerta ? (
              <div style={{ transform: `scale(${latido})`, fontSize: 12.5, fontWeight: 750, color: ROJO, background: alfa(ROJO, 0.12), borderRadius: 999, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 9, background: ROJO }} />
                {it.alerta}
              </div>
            ) : (
              it.valor && <div style={{ fontSize: 14, fontWeight: 700, color: TINTA, fontVariantNumeric: 'tabular-nums' }}>{it.valor}</div>
            )}
          </div>
        )
      })}
    </div>
  </div>
)

const Grafico: React.FC<{ b: Extract<BloqueApp, { tipo: 'grafico' }>; x: Ctx }> = ({ b, x }) => {
  const max = Math.max(...b.valores)
  const n = b.valores.length
  const hMax = 92
  const res = b.resaltar ?? n - 1
  return (
    <div style={{ ...tarjeta, ...aparece(x.t, 0, 10, 8) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: b.forma === 'linea' ? 12 : 30 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TINTA }}>{b.titulo}</div>
        {b.total && <div style={{ fontSize: 13, fontWeight: 700, color: x.color }}>{b.total}</div>}
      </div>
      {b.forma === 'linea' ? (
        (() => {
          const W = ANCHO - 20 - 36 - 32 // pantalla − márgenes − relleno de la tarjeta
          const pts = b.valores.map((v, i) => [((i + 0.5) / n) * W, hMax - (v / max) * (hMax - 8) + 4])
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
          const p = prog(x.t, 3, 24)
          const largo = 1400
          return (
            <svg width={W} height={hMax + 4} style={{ overflow: 'visible', display: 'block' }}>
              <path d={`${d} L${pts[n - 1][0]} ${hMax + 4} L${pts[0][0]} ${hMax + 4} Z`} fill={alfa(x.color, 0.12 * p)} />
              <path d={d} fill="none" stroke={x.color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={largo} strokeDashoffset={largo * (1 - p)} />
              {p > 0.9 && <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r={6 * prog(x.t, 22, 8)} fill="#fff" stroke={x.color} strokeWidth={3.5} />}
            </svg>
          )
        })()
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: hMax }}>
          {b.valores.map((v, i) => {
            const p = prog(x.t, 3 + i * 2, 16)
            const h = Math.max(4, (v / max) * hMax * p)
            const on = i === res
            return (
              <div key={i} style={{ flex: 1, height: h, borderRadius: 7, background: on ? x.color : alfa(x.color, 0.22), position: 'relative' }}>
                {on && p > 0.6 && (
                  <div style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 800, color: x.sobreColor, background: x.color, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap', opacity: interpolate(p, [0.6, 1], [0, 1]) }}>
                    {b.marca ?? Math.round(v)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {b.etiquetas && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {b.etiquetas.map((e, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: i === res ? 800 : 500, color: i === res ? TINTA : GRIS }}>{e}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const Calendario: React.FC<{ b: Extract<BloqueApp, { tipo: 'calendario' }>; x: Ctx }> = ({ b, x }) => {
  const dias = b.dias ?? DIAS.map((d, i) => ({ d, n: 3 + i }))
  const act = b.activo ?? 2
  return (
    <div>
      <Cabecera titulo={b.titulo} accion="Semana" x={x} />
      <div style={{ ...tarjeta, ...aparece(x.t, 1, 10, 8), display: 'flex', justifyContent: 'space-between', padding: '10px 10px' }}>
        {dias.map((d, i) => {
          const on = i === act
          const pOn = prog(x.t, 6, 10)
          return (
            <div key={i} style={{ width: 40, borderRadius: 12, padding: '6px 0', textAlign: 'center', background: on ? alfa(x.color, pOn) : 'transparent', color: on && pOn > 0.5 ? x.sobreColor : TINTA }}>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: on ? 0.85 : 0.5 }}>{d.d}</div>
              <div style={{ fontSize: 16, fontWeight: 750, marginTop: 2 }}>{d.n}</div>
              <div style={{ width: 4, height: 4, borderRadius: 9, margin: '3px auto 0', background: i < 5 && !on ? alfa(x.color, 0.7) : 'transparent' }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {b.citas.map((ci, i) => {
          const a = aparece(x.t, 5 + i * 3, 10, 12)
          return (
            <div key={i} style={{ ...tarjeta, ...a, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px 10px 10px', borderRadius: 16 }}>
              <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: i === 0 ? x.color : alfa(x.color, 0.35) }} />
              <div style={{ width: 50, fontSize: 14, fontWeight: 800, color: TINTA, fontVariantNumeric: 'tabular-nums' }}>{ci.hora}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 650, color: TINTA }}>{ci.nombre}</div>
                {ci.servicio && <div style={{ fontSize: 12.5, color: GRIS, marginTop: 1 }}>{ci.servicio}</div>}
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: alfa(x.color, 0.14), color: x.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                {ci.nombre.trim()[0]?.toUpperCase()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const Boton: React.FC<{ b: Extract<BloqueApp, { tipo: 'boton' }>; x: Ctx; t: number }> = ({ b, x, t }) => {
  const s = t < 0 ? 0 : spring({ frame: t, fps: FPS, config: { damping: 9, stiffness: 180, mass: 0.7 } })
  const brillo = interpolate(t, [10, 26], [-60, 160], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div
      style={{
        transform: `scale(${0.55 + 0.45 * s})`,
        opacity: Math.min(1, s * 2),
        height: 56,
        borderRadius: 16,
        background: x.color,
        color: x.sobreColor,
        boxShadow: `0 10px 24px ${alfa(x.color, 0.4)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        fontSize: 17,
        fontWeight: 750,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${brillo}%`, width: '40%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.45), transparent)', transform: 'skewX(-20deg)' }} />
      <Icono n={b.icono ?? 'CalendarPlus'} tam={20} color={x.sobreColor} />
      {b.texto}
    </div>
  )
}

const Bloque: React.FC<{ b: BloqueApp; t: number; color: string; sobreColor: string; brillo: number }> = ({ b, t, color, sobreColor, brillo }) => {
  const x: Ctx = { t, color, sobreColor }
  const fuera = 1 - prog(t, 0, 6) // el esqueleto se apaga al materializarse
  const real =
    b.tipo === 'saludo' ? <Saludo b={b} x={x} /> :
    b.tipo === 'stat' ? <Stat b={b} x={x} /> :
    b.tipo === 'tarjetas' ? <Tarjetas b={b} x={x} /> :
    b.tipo === 'lista' ? <Lista b={b} x={x} /> :
    b.tipo === 'grafico' ? <Grafico b={b} x={x} /> :
    b.tipo === 'calendario' ? <Calendario b={b} x={x} /> :
    <Boton b={b} x={x} t={t} />
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ visibility: t < 0 ? 'hidden' : 'visible' }}>{real}</div>
      {fuera > 0.001 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fuera }}>
          <Esqueleto b={b} brillo={brillo} />
        </div>
      )}
    </div>
  )
}

// ─── el celular ────────────────────────────────────────────────────────────
export const AppSeArma: React.FC<AppSeArmaProps> = ({ app, desde = 0, ritmo = 12, soloFinal = false, escala = 1, estilo }) => {
  const frameReal = useCurrentFrame()
  const fin = duracionAppSeArma(app, ritmo)
  const t = soloFinal ? fin + 60 : frameReal - desde
  const color = app.color
  const sobreColor = oscuro(color) ? '#fff' : TINTA

  // Entrada del celular.
  const pCel = prog(t, 0, 14)
  const momento = (i: number) => t - (T_PRIMERO + i * ritmo) // i = -1 → barra superior
  const brillo = 160 - ((t * 5) % 220) // el brillo del esqueleto barre de izquierda a derecha
  const pEsq = prog(t, 4, 8)

  // Destello final.
  const tListo = T_PRIMERO + app.bloques.length * ritmo
  const destello = interpolate(t, [tListo, tListo + 18], [-40, 140], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const anillo = prog(t, tListo, 22)
  const pListo = prog(t, tListo + 2, 10)
  const fueraListo = 1 - prog(t, tListo + 34, 12)
  const isla = soloFinal ? 0 : pListo * fueraListo

  const tb = momento(-1)
  const nombreIcono = app.icono ?? 'Sparkles'

  return (
    <div style={{ width: ANCHO * escala, height: ALTO * escala, position: 'relative', ...estilo }}>
      <div
        style={{
          width: ANCHO,
          height: ALTO,
          transform: `scale(${escala})`,
          transformOrigin: 'top left',
          position: 'absolute',
          left: 0,
          top: 0,
          opacity: pCel,
          filter: `blur(${(1 - pCel) * 10}px)`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - pCel) * 40}px) scale(${0.96 + 0.04 * pCel})` }}>
          {/* anillo de «lista» */}
          {anillo > 0 && anillo < 1 && (
            <div style={{ position: 'absolute', inset: -14 * anillo, borderRadius: 58 + 14 * anillo, border: `${4 * (1 - anillo) + 1}px solid ${alfa(color, 0.7 * (1 - anillo))}` }} />
          )}
          {/* cuerpo */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 58, background: '#0B0C0F', boxShadow: '0 40px 80px rgba(0,0,0,.22), 0 12px 24px rgba(0,0,0,.14), inset 0 0 0 1.5px #2A2C33' }} />
          {/* pantalla */}
          <div style={{ position: 'absolute', inset: 10, borderRadius: 48, overflow: 'hidden', background: FONDO, fontFamily: f.texto, color: TINTA }}>
            {/* barra de estado */}
            <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 28px 0 34px', fontSize: 15, fontWeight: 700 }}>
              <span>9:41</span>
              {/* la isla dinámica se abre para avisar «App lista» */}
              <div
                style={{
                  position: 'absolute', left: '50%', top: 11, transform: 'translateX(-50%)',
                  width: 104 + 74 * isla, height: 30 + 6 * isla, borderRadius: 20, background: '#0B0C0F',
                  display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', overflow: 'hidden', zIndex: 2,
                }}
              >
                <div style={{ opacity: isla, display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', transform: `scale(${0.7 + 0.3 * isla})`, transformOrigin: 'left center' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 999, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icono n="Check" tam={14} color={sobreColor} grosor={3.4} />
                  </div>
                  App lista
                </div>
              </div>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Icono n="Signal" tam={15} color={TINTA} grosor={2.6} />
                <Icono n="Wifi" tam={15} color={TINTA} grosor={2.6} />
                <Icono n="BatteryFull" tam={20} color={TINTA} grosor={2} />
              </span>
            </div>
            {/* barra superior de la app */}
            <div style={{ position: 'relative', height: 62, margin: '2px 18px 0' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 12, opacity: pEsq * (1 - prog(tb, 0, 6)) }}>
                <Hueso w={44} h={44} r={13} brillo={brillo} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Hueso w={150} h={15} brillo={brillo} />
                  <Hueso w={90} h={11} brillo={brillo} />
                </div>
              </div>
              {tb >= 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: color,
                      boxShadow: `0 6px 14px ${alfa(color, 0.35)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      transform: `scale(${spring({ frame: tb, fps: FPS, config: { damping: 11, stiffness: 200 } })}) rotate(${(1 - prog(tb, 0, 14)) * -25}deg)`,
                    }}
                  >
                    {app.emoji ?? <Icono n={nombreIcono} tam={22} color={sobreColor} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...aparece(tb, 2), fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>{app.nombre}</div>
                    {app.sub && <div style={{ ...aparece(tb, 4), fontSize: 12.5, color: GRIS, fontWeight: 500 }}>{app.sub}</div>}
                  </div>
                  <div style={{ ...aparece(tb, 6), width: 40, height: 40, borderRadius: 999, background: '#fff', boxShadow: SOMBRA, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <Icono n="Bell" tam={18} color={TINTA} />
                    <div style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 9, background: color, border: '1.5px solid #fff' }} />
                  </div>
                </div>
              )}
            </div>
            {/* contenido */}
            <div style={{ padding: '10px 18px 0', display: 'flex', flexDirection: 'column', gap: 14, opacity: pEsq }}>
              {app.bloques.map((b, i) => (
                <Bloque key={i} b={b} t={momento(i)} color={color} sobreColor={sobreColor} brillo={brillo} />
              ))}
            </div>
            {/* barra de inicio */}
            <div style={{ position: 'absolute', bottom: 9, left: '50%', transform: 'translateX(-50%)', width: 128, height: 5, borderRadius: 9, background: TINTA, opacity: 0.85 }} />
            {/* destello diagonal de «lista» */}
            {destello > -40 && destello < 140 && (
              <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', left: `${destello}%`, width: '45%', transform: 'translateX(-50%) skewX(-18deg)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)', pointerEvents: 'none' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
