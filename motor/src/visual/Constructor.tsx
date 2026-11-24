// Constructor: la escena icónica del vibe coding. Una ventana de herramienta
// de construir apps con IA, con el chat arriba y la vista previa abajo: se escribe
// el prompt, el cursor hace clic en «Enviar», la IA marca sus pasos y la app
// aparece con un leve zoom de cámara; al final el cursor toca un botón de la app.

import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { ArrowUp, Check, MessageCircle, ShoppingBag } from 'lucide-react'

import { FPS, c, ease, entra, f, herramientas, prog, rad } from '../tema'

export interface MomentosConstructor {
  tListo: number // frame en que la app termina de construirse
  tClick: number // frame en que el cursor toca el botón de la app
}

export interface MarcaHerramienta {
  nombre: string
  color: string // fondo del botón y de la etiqueta
  texto: string // color del texto encima de `color`
}

/** Marca neutra por defecto: un constructor de apps inventado. */
export const CONSTRUCTOR_GENERICO: MarcaHerramienta = { nombre: 'Constructor IA', color: '#6D5EF5', texto: '#fff' }

export interface ConstructorProps {
  /** Clave de `herramientas` (tema.ts) o la marca directa { nombre, color, texto }. */
  herramienta?: string | MarcaHerramienta
  prompt: string
  pasos?: string[]
  preview?: React.ReactNode | ((m: MomentosConstructor) => React.ReactNode)
  clickEn?: { x: number; y: number } // punto del botón dentro de la app (838×424)
  url?: string // dirección que se ve en la vista previa
  tEscribir?: number // empieza a escribirse el prompt
  tEnviar?: number // clic en «Enviar»
  tConstruir?: number // la IA empieza a marcar pasos
  pasoDur?: number // frames por paso
  tClick?: number // clic en el botón de la app
}

// ─── Geometría (coordenadas internas de la ventana, sin el borde) ──────────
const VX = 70
const VY = 250
const VW = 880
const VH = 990
const BORDE = 3
const IW = VW - BORDE * 2 // 874
const BARRA = 68
const CHAT = 420
const INPUT_Y = BARRA + CHAT - 18 - 92 // 378
const INPUT_H = 92
const BTN = 66
const BTN_X = IW - 20 - 16 - BTN // esquina izquierda del botón Enviar
const BTN_Y = INPUT_Y + (INPUT_H - BTN) / 2
const PREV_Y = BARRA + CHAT // 488
const URL_H = 46
const APP_X = 18
const APP_Y = PREV_Y + URL_H + 10 // 544
const APP_W = IW - APP_X * 2 // 838
const APP_H = VH - BORDE * 2 - APP_Y - 18 // 424
const CLICK_POR_DEFECTO = { x: APP_W / 2, y: 364 }

const escrito = (texto: string, frame: number, desde: number, cps: number) =>
  texto.slice(0, Math.max(0, Math.floor(((frame - desde) / FPS) * cps)))

// ─── Cursor del mouse con curvas suaves ────────────────────────────────────
type Punto = { f: number; x: number; y: number }

const posCursor = (frame: number, ks: Punto[]) => {
  if (frame <= ks[0].f) return { x: ks[0].x, y: ks[0].y }
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i]
    const b = ks[i + 1]
    if (frame <= b.f) {
      const t = ease(Math.min(1, Math.max(0, (frame - a.f) / Math.max(1, b.f - a.f))))
      // Arco: punto de control desplazado en perpendicular, como una mano de verdad.
      const dx = b.x - a.x
      const dy = b.y - a.y
      const cx = (a.x + b.x) / 2 - dy * 0.2
      const cy = (a.y + b.y) / 2 + dx * 0.2
      const u = 1 - t
      return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }
    }
  }
  const z = ks[ks.length - 1]
  return { x: z.x, y: z.y }
}

/** 0→1→0 alrededor de un clic: hundimiento corto. */
const hundido = (frame: number, t: number) =>
  interpolate(frame, [t - 3, t, t + 5], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

const Ripple: React.FC<{ x: number; y: number; t: number; color: string }> = ({ x, y, t, color }) => {
  const frame = useCurrentFrame()
  if (frame < t || frame > t + 22) return null
  const p = prog(frame, t, 20)
  return (
    <>
      {[0, 6].map((d) => {
        const q = prog(frame, t + d, 18)
        if (frame < t + d) return null
        return (
          <div
            key={d}
            style={{
              position: 'absolute',
              left: x - 70,
              top: y - 70,
              width: 140,
              height: 140,
              borderRadius: 999,
              border: `${d ? 3 : 5}px solid ${color}`,
              transform: `scale(${0.15 + q * 0.95})`,
              opacity: (1 - q) * (d ? 0.6 : 0.9) * (1 - p * 0.2),
            }}
          />
        )
      })}
    </>
  )
}

const FlechaMouse: React.FC<{ escala: number }> = ({ escala }) => (
  <svg width={54} height={64} viewBox="0 0 27 32" style={{ transform: `scale(${escala})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}>
    <path d="M2 2 L2 25 L8 19.5 L12.2 29 L16.4 27.2 L12.3 18 L20.5 18 Z" fill="#0a0a0a" stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
  </svg>
)

// ─── Paso de la IA: pendiente → girando → ✓ ────────────────────────────────
const Paso: React.FC<{ texto: string; desde: number; dur: number; color: string; alto: number }> = ({ texto, desde, dur, color, alto }) => {
  const frame = useCurrentFrame()
  if (frame < desde) return null
  const tOk = desde + dur - 5
  const ok = frame >= tOk
  const pOk = prog(frame, tOk, 10)
  return (
    <div style={{ ...entra(frame, desde, 9, 14), display: 'flex', alignItems: 'center', gap: 16, height: alto }}>
      <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
        {!ok ? (
          <svg width={32} height={32} viewBox="0 0 32 32" style={{ transform: `rotate(${(frame - desde) * 14}deg)` }}>
            <circle cx={16} cy={16} r={12} fill="none" stroke={c.papel2} strokeWidth={4} />
            <circle cx={16} cy={16} r={12} fill="none" stroke={color} strokeWidth={4} strokeDasharray="22 100" strokeLinecap="round" />
          </svg>
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${0.4 + pOk * 0.6 + Math.sin(pOk * Math.PI) * 0.18})`,
            }}
          >
            <Check size={20} color="#fff" strokeWidth={3.5} />
          </div>
        )}
      </div>
      <span
        style={{
          fontFamily: f.texto,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: -0.5,
          color: ok ? c.tinta : c.tinta2,
        }}
      >
        {texto}
        {!ok ? '…' : ''}
      </span>
    </div>
  )
}

// ─── Vista previa por defecto: app de pedidos de una panadería ─────────────
const CAFE = '#6B3418'
const CREMA = '#FFF6EA'
const MASA = '#F3D9B1'
const VERDE = '#22C55E'

const productos = [
  { emoji: '🥖', nombre: 'Pan francés', precio: '$2.000', fondo: '#F7E3C3' },
  { emoji: '🥐', nombre: 'Croissant', precio: '$3.500', fondo: '#FBE7CF' },
  { emoji: '🍰', nombre: 'Torta de fresa', precio: '$28.000', fondo: '#FADADD' },
]

export const PreviewPanaderia: React.FC<MomentosConstructor> = ({ tListo, tClick }) => {
  const frame = useCurrentFrame()
  const h = hundido(frame, tClick)
  const pedido = frame >= tClick + 4
  const pToast = prog(frame, tClick + 6, 14)
  return (
    <div style={{ position: 'absolute', inset: 0, background: CREMA, fontFamily: f.texto, overflow: 'hidden' }}>
      {/* Encabezado */}
      <div
        style={{
          ...entra(frame, tListo, 12, -20),
          height: 72,
          background: CAFE,
          display: 'flex',
          alignItems: 'center',
          padding: '0 26px',
          gap: 14,
          color: '#fff',
        }}
      >
        <span style={{ fontSize: 34 }}>🥐</span>
        <span style={{ fontWeight: 800, fontSize: 30, letterSpacing: -0.8, flex: 1 }}>La Espiga</span>
        <span style={{ fontWeight: 600, fontSize: 21, opacity: 0.85, marginRight: 18 }}>Menú</span>
        <span style={{ fontWeight: 600, fontSize: 21, opacity: 0.85, marginRight: 18 }}>Horario</span>
        <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingBag size={24} color="#fff" strokeWidth={2.4} />
          <span
            style={{
              position: 'absolute',
              top: -7,
              right: -7,
              minWidth: 22,
              height: 22,
              borderRadius: 99,
              background: VERDE,
              fontSize: 14,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${pedido ? 1 + Math.sin(prog(frame, tClick + 4, 10) * Math.PI) * 0.4 : 1})`,
            }}
          >
            {pedido ? 4 : 3}
          </span>
        </div>
      </div>
      {/* Título */}
      <div style={{ ...entra(frame, tListo + 5, 12), padding: '18px 26px 0', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: 36, letterSpacing: -1.2, color: '#2B1608' }}>Pan recién horneado</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: CAFE, background: MASA, padding: '6px 12px', borderRadius: 99 }}>Abierto · 6 a. m.</span>
      </div>
      {/* Tarjetas del menú */}
      <div style={{ display: 'flex', gap: 16, padding: '16px 24px 0' }}>
        {productos.map((p, i) => (
          <div
            key={p.nombre}
            style={{
              ...entra(frame, tListo + 9 + i * 4, 13, 30),
              flex: 1,
              height: 160,
              background: '#fff',
              borderRadius: 20,
              boxShadow: '0 10px 22px -12px rgba(107,52,24,0.45)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ height: 84, background: p.fondo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54 }}>{p.emoji}</div>
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 21, color: '#2B1608', letterSpacing: -0.4 }}>{p.nombre}</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: CAFE }}>{p.precio}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Botón de pedido (centro en 419, 371) */}
      <div
        style={{
          ...entra(frame, tListo + 22, 13, 24),
          position: 'absolute',
          left: APP_W / 2 - 250,
          top: 331,
          width: 500,
          height: 66,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 99,
            background: pedido ? '#1EB257' : VERDE,
            color: '#062e16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: -0.5,
            boxShadow: `0 ${12 - h * 9}px ${24 - h * 14}px -10px rgba(18,140,70,0.7)`,
            transform: `scale(${1 - h * 0.06}) translateY(${h * 3}px)`,
          }}
        >
          {pedido ? <Check size={30} color="#062e16" strokeWidth={3.2} /> : <MessageCircle size={30} color="#062e16" strokeWidth={2.6} />}
          {pedido ? 'Pedido enviado' : 'Pedir por mensaje'}
        </div>
      </div>
      {/* Aviso de pedido */}
      {frame >= tClick + 6 ? (
        <div
          style={{
            position: 'absolute',
            right: 22,
            top: 86,
            opacity: pToast,
            transform: `translateY(${(1 - pToast) * -24}px)`,
            background: '#fff',
            borderRadius: 16,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 16px 34px -14px rgba(0,0,0,0.45)',
            fontWeight: 700,
            fontSize: 20,
            color: '#2B1608',
          }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 99, background: VERDE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={20} color="#fff" strokeWidth={2.8} />
          </span>
          Nuevo pedido · 2 croissants
        </div>
      ) : null}
    </div>
  )
}

// ─── Esqueleto mientras la IA construye ────────────────────────────────────
const Esqueleto: React.FC<{ desde: number; n: number; paso: number }> = ({ desde, n, paso }) => {
  const frame = useCurrentFrame()
  const brillo = ((frame - desde) * 22) % 1400
  const bloque = (estilo: React.CSSProperties, i: number): React.CSSProperties => ({
    position: 'absolute',
    borderRadius: 16,
    background: `linear-gradient(100deg, ${c.papel2} 0px, ${c.papel2} ${brillo - 220}px, #f6f6f3 ${brillo - 80}px, ${c.papel2} ${brillo + 60}px, ${c.papel2} 2000px)`,
    backgroundAttachment: 'fixed',
    ...entra(frame, desde + Math.min(i, n - 1) * paso * 0.5, 10, 16),
    ...estilo,
  })
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff' }}>
      <div style={bloque({ left: 0, top: 0, width: APP_W, height: 72, borderRadius: 0 }, 0)} />
      <div style={bloque({ left: 26, top: 92, width: 380, height: 40 }, 1)} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={bloque({ left: 24 + i * 268, top: 156, width: 252, height: 160, borderRadius: 20 }, 1)} />
      ))}
      <div style={bloque({ left: APP_W / 2 - 250, top: 331, width: 500, height: 66, borderRadius: 99 }, 2)} />
    </div>
  )
}

// ─── La escena ─────────────────────────────────────────────────────────────
export const Constructor: React.FC<ConstructorProps> = ({
  herramienta = CONSTRUCTOR_GENERICO,
  prompt,
  pasos = ['Creando pantallas', 'Conectando base de datos', 'Publicando'],
  preview,
  clickEn,
  url,
  tEscribir = 18,
  tEnviar = 110,
  tConstruir,
  pasoDur = 26,
  tClick,
}) => {
  const frame = useCurrentFrame()
  const h: MarcaHerramienta =
    typeof herramienta === 'string' ? herramientas[herramienta] || { nombre: herramienta, color: c.tinta, texto: c.papel } : herramienta
  const dominio = h.nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '')
  const tCons = tConstruir ?? tEnviar + 14
  const tListo = tCons + pasos.length * pasoDur
  const tToque = tClick ?? tListo + 36
  const objetivo = clickEn ?? CLICK_POR_DEFECTO
  const slug = url ?? `mi-app.${dominio}.app`

  // Entrada de la ventana.
  const pV = prog(frame, 0, 18)

  // Prompt escrito letra por letra: termina 20 frames antes del clic.
  const cps = Math.max(26, prompt.length / Math.max(0.5, (tEnviar - 20 - tEscribir) / FPS))
  const enviado = frame >= tEnviar + 2
  const tecleado = escrito(prompt, frame, tEscribir, cps)
  const escribiendo = frame >= tEscribir && tecleado.length < prompt.length
  const caretVisible = !enviado && frame >= tEscribir - 6 && (escribiendo || Math.floor(frame / 15) % 2 === 0)
  const pSale = prog(frame, tEnviar + 1, 8)

  // Botón Enviar.
  const hEnv = hundido(frame, tEnviar)
  const activo = tecleado.length > 0 && !enviado
  const construyendo = enviado && frame < tListo

  // Cursor: aparece, va a Enviar, descansa sobre la vista previa y toca el botón de la app.
  const enviarCentro = { x: BTN_X + BTN / 2, y: BTN_Y + BTN / 2 }
  const appCentro = { x: APP_X + objetivo.x, y: APP_Y + objetivo.y }
  const ks: Punto[] = [
    { f: tEnviar - 30, x: 640, y: 760 },
    { f: tEnviar - 2, x: enviarCentro.x, y: enviarCentro.y },
    { f: tEnviar + 8, x: enviarCentro.x, y: enviarCentro.y },
    { f: tEnviar + 34, x: 700, y: 300 },
    { f: tToque - 24, x: 690, y: 312 },
    { f: tToque - 2, x: appCentro.x, y: appCentro.y },
    { f: tToque + 30, x: appCentro.x + 60, y: appCentro.y + 34 },
  ]
  const cur = posCursor(frame, ks)
  const pCur = prog(frame, tEnviar - 30, 10)
  const escCur = 1 - (hundido(frame, tEnviar) + hundido(frame, tToque)) * 0.16

  // Cámara de la vista previa: entra desde un poco lejos y empuja hacia el botón.
  const pApp = prog(frame, tListo, 22)
  const empuje = interpolate(frame, [tListo, tToque + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
  const escApp = 0.9 + pApp * 0.1 + empuje * 0.03
  const pEsq = prog(frame, tEnviar + 4, 10)
  const flash = interpolate(frame, [tListo - 1, tListo + 2, tListo + 14], [0, 0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Alto de la burbuja (estimado: ~13,5 px por letra en 576 px de ancho útil) y de los pasos.
  const lineas = Math.max(1, Math.ceil((prompt.length * 13.5) / 576))
  const topResp = 20 + 32 + lineas * 35 + 14
  const altoPaso = Math.max(30, Math.min(40, (INPUT_Y - BARRA - 12 - topResp - 38) / Math.max(1, pasos.length)))
  const colorToque = preview ? h.color : VERDE

  // Leve vida en toda la ventana.
  const flota = Math.sin(frame / 34) * 4

  const contenidoPreview = typeof preview === 'function' ? preview({ tListo, tClick: tToque }) : preview ?? <PreviewPanaderia tListo={tListo} tClick={tToque} />

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: VX,
          top: VY,
          width: VW,
          height: VH,
          opacity: pV,
          filter: `blur(${(1 - pV) * 10}px)`,
          transform: `translateY(${(1 - pV) * 60 + flota}px) scale(${0.95 + pV * 0.05})`,
        }}
      >
        {/* Sombra (capa aparte para que no la recorte el overflow) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: rad(28), boxShadow: '0 60px 120px -30px rgba(10,10,10,0.35), 0 24px 40px -20px rgba(10,10,10,0.3)' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#fff',
            border: `${BORDE}px solid ${c.tinta}`,
            borderRadius: rad(28),
            overflow: 'hidden',
          }}
        >
          {/* Barra de ventana */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: IW,
              height: BARRA,
              borderBottom: `2px solid ${c.tinta}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              gap: 12,
              background: c.papel,
              boxSizing: 'border-box',
            }}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 18, height: 18, borderRadius: 99, border: `2.5px solid ${c.tinta}`, background: i === 0 ? c.tinta : 'transparent' }} />
            ))}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontFamily: f.mono, fontSize: 22, color: c.tinta2, padding: '6px 18px', background: c.papel2, borderRadius: rad(99) }}>
                {dominio}.dev/proyectos/{slug.split('.')[0]}
              </span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: h.color,
                color: h.texto,
                fontFamily: f.texto,
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: -0.4,
                padding: '8px 16px',
                borderRadius: rad(12),
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 99, background: h.texto }} />
              {h.nombre}
            </span>
          </div>

          {/* Chat */}
          <div style={{ position: 'absolute', left: 0, top: BARRA, width: IW, height: CHAT, background: '#fff' }}>
            {/* Saludo vacío antes de enviar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 96,
                textAlign: 'center',
                fontFamily: f.display,
                fontWeight: 800,
                fontSize: 46,
                letterSpacing: -1.8,
                color: c.tinta,
                opacity: (1 - pSale) * prog(frame, 6, 12),
                transform: `translateY(${-pSale * 30}px)`,
              }}
            >
              ¿Qué vamos a construir?
            </div>

            {/* Mensaje enviado */}
            {enviado ? (
              <div style={{ position: 'absolute', right: 22, top: 20, maxWidth: 620, ...entra(frame, tEnviar + 2, 10, 60) }}>
                <div
                  style={{
                    background: c.tinta,
                    color: c.papel,
                    fontFamily: f.texto,
                    fontWeight: 600,
                    fontSize: 27,
                    lineHeight: 1.3,
                    letterSpacing: -0.4,
                    padding: '16px 22px',
                    borderRadius: rad(22),
                  }}
                >
                  {prompt}
                </div>
              </div>
            ) : null}

            {/* Respuesta con pasos */}
            {frame >= tCons - 6 ? (
              <div style={{ position: 'absolute', left: 24, top: topResp, width: IW - 48 }}>
                <div style={{ ...entra(frame, tCons - 6, 10, 14), display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <span style={{ width: 30, height: 30, borderRadius: rad(8), background: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 99, background: h.texto }} />
                  </span>
                  <span style={{ fontFamily: f.texto, fontWeight: 800, fontSize: 25, color: c.tinta }}>{h.nombre}</span>
                  <span style={{ fontFamily: f.mono, fontSize: 20, color: frame >= tListo ? h.color : c.tinta2, fontWeight: 700 }}>
                    {frame >= tListo ? '✓ listo, ya está en línea' : 'trabajando' + '.'.repeat(1 + (Math.floor(frame / 8) % 3))}
                  </span>
                </div>
                {pasos.map((p, i) => (
                  <Paso key={i} texto={p} desde={tCons + i * pasoDur} dur={pasoDur} color={h.color} alto={altoPaso} />
                ))}
              </div>
            ) : null}

            {/* Caja de texto */}
            <div
              style={{
                position: 'absolute',
                left: 20,
                top: INPUT_Y - BARRA,
                width: IW - 40,
                height: INPUT_H,
                boxSizing: 'border-box',
                border: `2.5px solid ${activo ? c.tinta : c.papel2}`,
                borderRadius: rad(24),
                background: c.papel,
                padding: '0 120px 0 24px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: f.texto,
                  fontSize: 27,
                  lineHeight: 1.3,
                  fontWeight: 500,
                  letterSpacing: -0.3,
                  color: c.tinta,
                  opacity: enviado ? 0 : 1 - pSale,
                }}
              >
                {tecleado || (frame < tEscribir ? <span style={{ color: c.tinta2 }}>Describe tu app…</span> : null)}
                {caretVisible ? <span style={{ display: 'inline-block', width: 3, height: 32, background: c.tinta, verticalAlign: '-6px', marginLeft: 2 }} /> : null}
              </div>
              {enviado ? (
                <div style={{ ...entra(frame, tEnviar + 8, 10, 0), position: 'absolute', left: 24, fontFamily: f.texto, fontSize: 27, color: c.tinta2 }}>
                  Pide un cambio…
                </div>
              ) : null}
            </div>
            {/* Botón Enviar */}
            <div
              style={{
                position: 'absolute',
                left: BTN_X,
                top: BTN_Y - BARRA,
                width: BTN,
                height: BTN,
                borderRadius: rad(18) || 0,
                background: activo || frame >= tListo ? h.color : construyendo ? c.tinta : c.papel2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${1 - hEnv * 0.12}) translateY(${hEnv * 3}px)`,
                boxShadow: activo ? `0 ${10 - hEnv * 8}px 20px -8px ${h.color}` : 'none',
              }}
            >
              {construyendo ? (
                <span style={{ width: 22, height: 22, background: c.papel, borderRadius: 3 }} />
              ) : (
                <ArrowUp size={34} color={activo || frame >= tListo ? h.texto : c.tinta2} strokeWidth={3} />
              )}
            </div>
          </div>

          {/* Vista previa */}
          <div style={{ position: 'absolute', left: 0, top: PREV_Y, width: IW, height: VH - BORDE * 2 - PREV_Y, background: c.papel, borderTop: `2px solid ${c.tinta}` }}>
            <div style={{ height: URL_H, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px 0' }}>
              <span style={{ fontFamily: f.mono, fontWeight: 700, fontSize: 18, letterSpacing: 3, color: c.tinta }}>VISTA PREVIA</span>
              <span style={{ flex: 1 }} />
              <span style={{ width: 10, height: 10, borderRadius: 99, background: frame >= tListo ? '#22C55E' : c.tinta2 }} />
              <span style={{ fontFamily: f.mono, fontSize: 19, color: c.tinta2 }}>{frame >= tListo ? slug : 'sin publicar'}</span>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: APP_X,
              top: APP_Y,
              width: APP_W,
              height: APP_H,
              borderRadius: 18,
              overflow: 'hidden',
              border: `2px solid ${c.papel2}`,
              background: '#fff',
            }}
          >
            {/* Vacío */}
            {pEsq < 1 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 14,
                  border: `3px dashed ${c.papel2}`,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: f.mono,
                  fontSize: 24,
                  color: c.tinta2,
                  opacity: 1 - pEsq,
                }}
              >
                tu app aparecerá aquí
              </div>
            ) : null}
            {/* Esqueleto */}
            {frame >= tEnviar + 4 && pApp < 1 ? (
              <div style={{ position: 'absolute', inset: 0, opacity: 1 - pApp }}>
                <Esqueleto desde={tEnviar + 4} n={pasos.length} paso={pasoDur} />
              </div>
            ) : null}
            {/* App con cámara */}
            {frame >= tListo ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: pApp,
                  transform: `scale(${escApp})`,
                  transformOrigin: `${objetivo.x}px ${objetivo.y}px`,
                }}
              >
                {contenidoPreview}
              </div>
            ) : null}
            <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Ripples y cursor, encima de todo (coordenadas internas + borde) */}
        <div style={{ position: 'absolute', left: BORDE, top: BORDE }}>
          <Ripple x={enviarCentro.x} y={enviarCentro.y} t={tEnviar} color={h.color} />
          <Ripple x={appCentro.x} y={appCentro.y} t={tToque} color={colorToque} />
          <div style={{ position: 'absolute', left: cur.x - 4, top: cur.y - 3, opacity: pCur }}>
            <FlechaMouse escala={escCur} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
