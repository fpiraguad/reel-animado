import React from 'react'
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { icons, type LucideIcon } from 'lucide-react'

import { ease, f, prog } from '../tema'

// ─── Teléfono ──────────────────────────────────────────────────────────────
// Un celular moderno que entra con un giro 3D (llega inclinado y se endereza),
// flota mientras está en pantalla y muestra dentro una app: `children` o una
// `imagen` de public/. Todo lo de adentro se escribe en puntos lógicos de una
// pantalla de 390 × 844 (como un celular moderno); el componente lo escala a `alto`.

export const PANTALLA_W = 390
export const PANTALLA_H = 844
const BISEL = 12
const CUERPO_W = PANTALLA_W + BISEL * 2
const CUERPO_H = PANTALLA_H + BISEL * 2
const RADIO = 66
const BARRA = 54 // alto de la barra de estado

export interface Toque {
  /** Posición en puntos de la pantalla (0–390, 0–844). */
  x: number
  y: number
  /** Frame (relativo a la escena) en que el dedo toca. */
  frame: number
}

export interface Notificacion {
  titulo: string
  texto: string
  /** Nombre de un ícono de lucide: 'shopping-bag', 'ShoppingBag', 'bell'… */
  icono?: string
  /** Nombre de la app que la manda (va en mayúsculas pequeñas). */
  app?: string
  color?: string
  /** Frame en que empieza a bajar. */
  frame: number
  /** Cuántos frames se queda antes de subir (por defecto 80). */
  dura?: number
}

export interface PropsTelefono {
  /** Frame en que empieza la entrada (giro 3D). */
  desde?: number
  /** Frame en que empieza a salir (opcional). */
  hasta?: number
  /** Alto del cuerpo en px del video. 820 (centro y 828) deja sitio para un titular arriba. */
  alto?: number
  /** Centro del teléfono en px del video. */
  x?: number
  y?: number
  /** Imagen de public/ (ruta para staticFile) en lugar de children. */
  imagen?: string
  /** Desplazamiento vertical del contenido: de `desde` a `hasta` (frames) baja `px` puntos. */
  scroll?: { desde: number; hasta: number; px: number }
  toques?: Toque[]
  notificacion?: Notificacion
  /** Barra de estado (hora, señal, batería). Por defecto sí con children y no con imagen. */
  barra?: boolean
  /** Fondo de la pantalla detrás del contenido. */
  fondo?: string
  /** Lado desde el que llega girando. */
  lado?: 'izquierda' | 'derecha'
  children?: React.ReactNode
}

const aPascal = (s: string) =>
  s.includes('-') || s.includes('_') || s[0] === s[0].toLowerCase()
    ? s.split(/[-_ ]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
    : s

export const iconoLucide = (nombre?: string): LucideIcon => {
  const m = icons as Record<string, LucideIcon>
  return (nombre && (m[aPascal(nombre)] || m[nombre])) || m.Bell
}

// ─── Piezas internas ───────────────────────────────────────────────────────

const BarraEstado: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: BARRA, zIndex: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 34px 0 42px', fontFamily: f.texto, fontWeight: 600, fontSize: 17, color,
    }}
  >
    <span style={{ letterSpacing: -0.3 }}>9:41</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* señal */}
      <svg width="18" height="12" viewBox="0 0 18 12">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 4.7} y={9 - i * 3} width="3.3" height={3 + i * 3} rx="1" fill={color} />
        ))}
      </svg>
      {/* wifi */}
      <svg width="16" height="12" viewBox="0 0 16 12">
        <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0Z M3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0Z M1.2 4.6a9.6 9.6 0 0 1 13.6 0l-1.4 1.4a7.6 7.6 0 0 0-10.8 0Z" fill={color} />
      </svg>
      {/* batería */}
      <svg width="27" height="13" viewBox="0 0 27 13">
        <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke={color} strokeOpacity="0.4" />
        <rect x="2.5" y="2.5" width="17" height="8" rx="2" fill={color} />
        <rect x="24.5" y="4.3" width="1.6" height="4.4" rx="0.8" fill={color} fillOpacity="0.45" />
      </svg>
    </span>
  </div>
)

const Ripple: React.FC<{ t: Toque; frame: number }> = ({ t, frame }) => {
  const d = frame - t.frame
  if (d < -4 || d > 26) return null
  // el dedo: llega (−4→0), aprieta (0→6) y se va
  const dedo = interpolate(d, [-4, 0, 7, 14], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const aprieta = interpolate(d, [-4, 0, 5, 12], [1.25, 1, 0.82, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const onda = interpolate(d, [0, 24], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const onda2 = interpolate(d, [4, 26], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const anillo = (p: number, max: number, a: number) => (
    <div
      style={{
        position: 'absolute', left: t.x - max / 2, top: t.y - max / 2, width: max, height: max, borderRadius: '50%',
        border: `${3 * (1 - p) + 1.5}px solid rgba(255,255,255,${a * (1 - p)})`,
        boxShadow: `0 0 0 2px rgba(10,10,10,${0.28 * (1 - p)}), inset 0 0 0 2px rgba(10,10,10,${0.2 * (1 - p)})`,
        background: `rgba(10,10,10,${0.1 * (1 - p)})`,
        transform: `scale(${0.2 + p * 0.8})`,
        opacity: d >= 0 ? 1 : 0,
      }}
    />
  )
  return (
    <>
      {anillo(onda, 120, 0.95)}
      {anillo(onda2, 170, 0.6)}
      <div
        style={{
          position: 'absolute', left: t.x - 26, top: t.y - 26, width: 52, height: 52, borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, rgba(70,70,70,0.55), rgba(20,20,20,0.42) 70%)',
          border: '3px solid rgba(255,255,255,0.95)',
          boxShadow: '0 8px 22px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,0,0,0.15)',
          opacity: dedo, transform: `scale(${aprieta})`,
        }}
      />
    </>
  )
}

const Banner: React.FC<{ n: Notificacion; frame: number }> = ({ n, frame }) => {
  const dura = n.dura ?? 80
  const baja = prog(frame, n.frame, 16)
  const sube = prog(frame, n.frame + dura, 12)
  if (frame < n.frame || sube >= 1) return null
  const y = interpolate(baja - sube, [0, 1], [-150, 54])
  const escala = interpolate(baja, [0, 1], [0.92, 1]) - sube * 0.04
  const Icono = iconoLucide(n.icono)
  const color = n.color ?? '#E8833A'
  return (
    <div
      style={{
        position: 'absolute', left: 10, right: 10, top: y, zIndex: 20,
        transform: `scale(${escala})`, transformOrigin: '50% 0%',
        borderRadius: 26, padding: '14px 16px', display: 'flex', gap: 13, alignItems: 'center',
        background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(18px)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.7)',
        fontFamily: f.texto, color: '#0a0a0a',
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 11, background: color, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.12)',
          transform: `scale(${interpolate(prog(frame, n.frame + 6, 14), [0, 1], [0.6, 1])})`,
        }}
      >
        <Icono size={25} color="#fff" strokeWidth={2.3} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.2 }}>{n.titulo}</span>
          <span style={{ fontSize: 13, color: '#6b6b6b' }}>ahora</span>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.3, color: '#2a2a2a', marginTop: 2 }}>{n.texto}</div>
        {n.app ? <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: '#8a8a8a', marginTop: 4 }}>{n.app.toUpperCase()}</div> : null}
      </div>
    </div>
  )
}

// ─── El teléfono ───────────────────────────────────────────────────────────

export const Telefono: React.FC<PropsTelefono> = ({
  desde = 0, hasta, alto = 820, x = 540, y = 828, imagen, scroll, toques = [], notificacion,
  barra, fondo = '#ffffff', lado = 'izquierda', children,
}) => {
  const frame = useCurrentFrame()
  const escala = alto / CUERPO_H
  const s = lado === 'izquierda' ? 1 : -1

  // Entrada: giro 3D de 30 frames (llega inclinado, de abajo y de lado; se endereza).
  const p = prog(frame, desde, 38)
  const pr = prog(frame, desde + 2, 58) // la rotación termina un poco después: se siente con peso
  // Salida: se va girando hacia el otro lado.
  const q = hasta !== undefined ? prog(frame, hasta, 18) : 0

  // Flotación suave mientras está en pantalla (se suma cuando ya entró).
  const t = (frame - desde) / 30
  const flota = prog(frame, desde + 16, 30)
  const fy = Math.sin(t * 1.25) * 9 * flota
  const fRotY = Math.sin(t * 0.9 + 0.6) * 4.5 * flota
  const fRotX = Math.cos(t * 0.75) * 2.2 * flota

  const rotY = s * (1 - pr) * -58 + fRotY + s * q * 38
  const rotX = (1 - pr) * 26 + fRotX - q * 8
  const rotZ = s * (1 - pr) * -12
  const ty = (1 - p) * 360 + fy + q * 120
  const tx = s * (1 - p) * -120 + s * q * 160
  const sc = 0.86 + 0.14 * p - q * 0.08
  const op = Math.min(1, prog(frame, desde, 8)) * (1 - prog(frame, (hasta ?? 1e9) + 6, 10))

  // Brillo del vidrio: se mueve con el giro.
  const brillo = 30 + rotY * 1.6

  const desp = scroll ? interpolate(frame, [scroll.desde, scroll.hasta], [0, scroll.px], {
    easing: (v) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) : 0
  const conBarra = barra ?? !imagen

  // Sombra en el piso: se acerca y se aprieta al aterrizar, respira con la flotación.
  const sombraOp = p * (0.34 - fy * 0.008) * (1 - q)
  const sombraW = CUERPO_W * escala * (0.95 - fy * 0.004)

  const capasCanto = 7

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* sombra de piso */}
      <div
        style={{
          position: 'absolute', left: x - sombraW / 2, top: y + alto / 2 + 18, width: sombraW, height: 46,
          borderRadius: '50%', background: 'rgba(10,10,10,1)', filter: 'blur(26px)', opacity: sombraOp,
        }}
      />
      <div style={{ position: 'absolute', left: x, top: y, perspective: 2600, perspectiveOrigin: '50% 40%' }}>
        <div
          style={{
            position: 'absolute', width: CUERPO_W, height: CUERPO_H, left: -CUERPO_W / 2, top: -CUERPO_H / 2,
            transformStyle: 'preserve-3d', opacity: op,
            transform: `translate(${tx}px, ${ty}px) scale(${sc * escala}) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
            filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined,
          }}
        >
          {/* canto: capas detrás que dan grosor al girar */}
          {Array.from({ length: capasCanto }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', inset: 0, borderRadius: RADIO,
                background: i === capasCanto - 1 ? '#111113' : '#2b2b2f',
                transform: `translateZ(${-(i + 1) * 2.2}px)`,
              }}
            />
          ))}
          {/* botones laterales */}
          {[
            { lado: -1, top: 150, h: 30 },
            { lado: -1, top: 210, h: 58 },
            { lado: -1, top: 282, h: 58 },
            { lado: 1, top: 240, h: 92 },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', top: b.top, height: b.h, width: 5,
                left: b.lado < 0 ? -3.5 : undefined, right: b.lado > 0 ? -3.5 : undefined,
                borderRadius: 3, background: 'linear-gradient(90deg, #1a1a1d, #46464c 50%, #1a1a1d)',
                transform: 'translateZ(-6px)',
              }}
            />
          ))}
          {/* cuerpo */}
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: RADIO,
              background: 'linear-gradient(145deg, #3a3a3f 0%, #121214 22%, #0b0b0c 70%, #2a2a2e 100%)',
              boxShadow: '0 50px 90px -20px rgba(0,0,0,0.45), 0 24px 40px -18px rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.14), inset 0 0 0 4px #0b0b0c',
            }}
          />
          {/* pantalla */}
          <div
            style={{
              position: 'absolute', left: BISEL, top: BISEL, width: PANTALLA_W, height: PANTALLA_H,
              borderRadius: RADIO - BISEL, overflow: 'hidden', background: fondo,
              transform: 'translateZ(0.5px)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, paddingTop: conBarra ? BARRA : 0, transform: `translateY(${-desp}px)` }}>
              {imagen ? (
                <Img src={staticFile(imagen)} style={{ width: '100%', display: 'block' }} />
              ) : (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
              )}
            </div>
            {conBarra ? <BarraEstado color="#0a0a0a" /> : null}
            {/* isla */}
            <div
              style={{
                position: 'absolute', top: 11, left: PANTALLA_W / 2 - 62, width: 124, height: 36, borderRadius: 20,
                background: '#000', zIndex: 30,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ position: 'absolute', right: 14, top: 11, width: 14, height: 14, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #2b3550, #07080c 65%)' }} />
            </div>
            {notificacion ? <Banner n={notificacion} frame={frame} /> : null}
            {toques.map((tq, i) => <Ripple key={i} t={tq} frame={frame} />)}
            {/* indicador de inicio */}
            <div style={{ position: 'absolute', bottom: 8, left: PANTALLA_W / 2 - 68, width: 136, height: 5, borderRadius: 3, background: 'rgba(10,10,10,0.85)', zIndex: 30 }} />
            {/* brillo del vidrio */}
            <div
              style={{
                position: 'absolute', inset: 0, zIndex: 40,
                background: `linear-gradient(${115 + rotY * 0.6}deg, rgba(255,255,255,0) ${brillo - 22}%, rgba(255,255,255,0.16) ${brillo}%, rgba(255,255,255,0) ${brillo + 18}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
