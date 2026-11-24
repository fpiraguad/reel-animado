import React from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { loadFont as loadInterTight } from '@remotion/google-fonts/InterTight'
import { loadFont as loadJetBrains } from '@remotion/google-fonts/JetBrainsMono'

import { ease, entra, prog } from '../tema'

// «Carrera»: dos herramientas construyen la misma app en dos carriles verticales.
// Paleta «Noche de laboratorio» (oscura con glow), propia de esta pieza.

const inter = loadInterTight('normal', { weights: ['500', '600', '700', '800', '900'], subsets: ['latin'] })
const jet = loadJetBrains('normal', { weights: ['500', '700', '800'], subsets: ['latin'] })
const FT = inter.fontFamily
const FM = jet.fontFamily

export const noche = {
  fondo: '#0B0B0F',
  tarjeta: '#14141B',
  linea: '#26262F',
  texto: '#F5F5F7',
  texto2: '#9A9AA8',
  meta: '#FFD166',
}

export interface AppMini {
  nombre: string // «Formora»
  url: string // «formora.app»
  fondo: string // color de la app (es el «producto»: puede tener color propio)
  tinta: string
  tinta2: string
  acento: string
  titulo: string
  pregunta1: string
  pregunta2: string
  boton: string
  tituloSerif?: boolean
}

export interface Corredor {
  nombre: string // «Agente A»
  color: string // #F97316
  color2: string // fin del degradado: #FDBA74
  marca?: 'chispa' | 'nudo'
  tiempo: string // tiempo final «h:mm», p. ej. «5:32»
  costo: number // US$ finales, p. ej. 832
  app: AppMini
}

export interface CarreraProps {
  a: Corredor // el que llega primero
  b: Corredor
  desde?: number // entra la pieza
  tLlegaA?: number // frame en que A cruza la meta
  tLlegaB?: number // frame en que B termina
  textos?: Partial<{ tiempo: string; costo: string; notaCosto: string; progreso: string; llego: string; enVivo: string; meta: string; vs: string; diferenciaB: string }>
}

const TEXTOS = {
  tiempo: 'TIEMPO',
  costo: 'COSTO',
  notaCosto: 'equivalente en API',
  progreso: 'PROGRESO',
  llego: 'LLEGÓ',
  enVivo: 'EN VIVO',
  meta: 'META',
  vs: 'VS',
  diferenciaB: '', // vacío = se calcula («+56:15 h»)
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const aMin = (t: string) => {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0)
  return h * 60 + m
}
const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`
const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const alfa = (hex: string, a: number) => hex + Math.round(clamp01(a) * 255).toString(16).padStart(2, '0')

// Curva del cronómetro: arranca suave y frena al llegar (en la llegada manda la curva de la casa).
const corre = Easing.bezier(0.33, 0.05, 0.3, 1)
const acelera = Easing.bezier(0.2, 0.7, 0.3, 1)

/** «Tick»: 1 justo cuando `fn` cruza un múltiplo de `paso`, y cae a 0 en 7 frames. */
const tick = (fn: (f: number) => number, frame: number, paso: number) => {
  for (let k = 0; k < 7; k++) {
    if (Math.floor(fn(frame - k) / paso) !== Math.floor(fn(frame - k - 1) / paso)) return Math.pow(1 - k / 7, 2)
  }
  return 0
}

// ─── Odómetro: cada dígito gira, con desenfoque según la velocidad ─────────────
// `ventana`: fracción final de la unidad en que gira (= cuando gira el dígito de abajo).
const Digito: React.FC<{ v: number; vAntes: number; radix: number; ventana: number; alto: number; ancho: number }> = ({ v, vAntes, radix, ventana, alto, ancho }) => {
  const base = Math.floor(v + 1e-6)
  const frac = v - base
  const giro = ventana >= 1 ? frac : clamp01((frac - (1 - ventana)) / ventana)
  const d = ((base % radix) + radix) % radix
  const vel = Math.abs(v - vAntes)
  const blur = Math.min(7, vel * 5)
  return (
    <span style={{ display: 'inline-block', width: ancho, height: alto, overflow: 'hidden', position: 'relative', verticalAlign: 'top' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, width: ancho, transform: `translateY(${-giro * alto}px)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
        <span style={{ display: 'block', height: alto, lineHeight: `${alto}px`, textAlign: 'center' }}>{d}</span>
        <span style={{ display: 'block', height: alto, lineHeight: `${alto}px`, textAlign: 'center' }}>{(d + 1) % radix}</span>
      </span>
    </span>
  )
}

/** h:mm con odómetro. `min` y `minAntes` en minutos (continuos). */
const Reloj: React.FC<{ min: number; minAntes: number; tam: number }> = ({ min, minAntes, tam }) => {
  const alto = Math.round(tam * 1.08)
  const ancho = Math.round(tam * 0.6)
  const dig = (base: number, radix: number, ventana: number) => (
    <Digito v={min / base} vAntes={minAntes / base} radix={radix} ventana={ventana} alto={alto} ancho={ancho} />
  )
  // La decena de horas aparece (se abre su hueco) solo al pasar de 9:59.
  const decena = ease(clamp01((min / 60 - 9.75) / 0.25))
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', maskImage: 'linear-gradient(transparent 0%, #000 16%, #000 84%, transparent 100%)', WebkitMaskImage: 'linear-gradient(transparent 0%, #000 16%, #000 84%, transparent 100%)' }}>
      <span style={{ display: 'inline-block', width: ancho * decena, overflow: 'hidden', opacity: decena }}>{dig(600, 10, 1 / 600)}</span>
      {dig(60, 10, 1 / 60)}
      <span style={{ display: 'inline-block', width: ancho * 0.5, height: alto, lineHeight: `${alto * 0.94}px`, textAlign: 'center' }}>:</span>
      {dig(10, 6, 0.1)}
      {dig(1, 10, 1)}
    </span>
  )
}

// ─── Marcas (símbolos geométricos genéricos, no logos reales) ───────────────────────────────────────────────────────
const Marca: React.FC<{ tipo: 'chispa' | 'nudo'; color: string; color2: string; tam: number; giro: number }> = ({ tipo, color, color2, tam, giro }) => {
  const id = `g-${tipo}`
  return (
    <svg width={tam} height={tam} viewBox="-50 -50 100 100" style={{ transform: `rotate(${giro}deg)`, overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color2} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      {tipo === 'chispa'
        ? Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2
            const r = i % 2 ? 34 : 46
            return <line key={i} x1={0} y1={0} x2={Math.cos(a) * r} y2={Math.sin(a) * r} stroke={`url(#${id})`} strokeWidth={13} strokeLinecap="round" />
          })
        : Array.from({ length: 3 }).map((_, i) => (
            <ellipse key={i} cx={0} cy={0} rx={42} ry={17} fill="none" stroke={`url(#${id})`} strokeWidth={10} transform={`rotate(${i * 60})`} />
          ))}
    </svg>
  )
}

const Bandera: React.FC<{ tam: number }> = ({ tam }) => {
  const c = 4
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24">
      <rect x={3} y={2} width={2.2} height={21} rx={1.1} fill="#0B0B0F" />
      {Array.from({ length: 3 }).map((_, fila) =>
        Array.from({ length: c }).map((__, col) => (
          <rect key={`${fila}-${col}`} x={5.2 + col * 4} y={3 + fila * 3.6} width={4} height={3.6} fill={(fila + col) % 2 ? '#FFD166' : '#0B0B0F'} />
        )),
      )}
      <rect x={5.2} y={3} width={16} height={10.8} fill="none" stroke="#0B0B0F" strokeWidth={1.2} />
    </svg>
  )
}

// ─── Mini app: un creador de formularios que se arma por bloques ───────────────
const Bloque: React.FC<{ p: number; inicio: number; fin: number; color: string; app: AppMini; frame: number; alto: number; children: React.ReactNode }> = ({ p, inicio, fin, color, app, frame, alto, children }) => {
  const enObra = p >= inicio && p < fin
  const listo = ease(clamp01((p - fin) / 0.07))
  const visto = ease(clamp01((p - inicio) / 0.04))
  const brillo = (frame * 0.035) % 1
  return (
    <div style={{ position: 'relative', height: alto, borderRadius: 12 }}>
      {/* esqueleto mientras se construye */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          opacity: (1 - listo) * (0.35 + 0.65 * visto),
          background: `linear-gradient(100deg, ${alfa(app.tinta, 0.06)} ${brillo * 100 - 30}%, ${alfa(app.tinta, 0.14)} ${brillo * 100}%, ${alfa(app.tinta, 0.06)} ${brillo * 100 + 30}%)`,
          border: `2px dashed ${enObra ? color : alfa(app.tinta, 0.14)}`,
          boxShadow: enObra ? `0 0 18px ${alfa(color, 0.55)}` : undefined,
        }}
      />
      {enObra && (
        <div style={{ position: 'absolute', right: 10, top: -11, background: color, color: '#fff', fontFamily: FM, fontSize: 12, fontWeight: 700, padding: '3px 7px', borderRadius: 6, letterSpacing: 0.5 }}>
          {Math.floor(frame / 6) % 2 ? 'escribiendo…' : 'escribiendo·'}
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, opacity: listo, transform: `translateY(${(1 - listo) * 14}px) scale(${0.97 + 0.03 * listo})`, filter: `blur(${(1 - listo) * 8}px)` }}>{children}</div>
    </div>
  )
}

const MiniApp: React.FC<{ app: AppMini; p: number; color: string; frame: number; ancho: number; alto: number }> = ({ app, p, color, frame, ancho, alto }) => {
  const t = app.tinta
  return (
    <div style={{ width: ancho, height: alto, background: app.fondo, borderRadius: 20, overflow: 'hidden', position: 'relative', boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px ${alfa('#ffffff', 0.06)}` }}>
      {/* barra del navegador */}
      <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', background: alfa(t, 0.05), borderBottom: `1px solid ${alfa(t, 0.08)}` }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((k) => (
          <div key={k} style={{ width: 9, height: 9, borderRadius: 9, background: k }} />
        ))}
        <div style={{ marginLeft: 10, flex: 1, height: 20, borderRadius: 10, background: alfa(t, 0.06), fontFamily: FM, fontSize: 12, color: app.tinta2, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>{app.url}</div>
      </div>
      <div style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Bloque p={p} inicio={0.03} fin={0.2} color={color} app={app} frame={frame} alto={92}>
          <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: app.acento, letterSpacing: 1.5 }}>{app.nombre.toUpperCase()}</div>
          <div style={{ fontFamily: app.tituloSerif ? 'Georgia, serif' : FT, fontStyle: app.tituloSerif ? 'italic' : 'normal', fontSize: 27, fontWeight: app.tituloSerif ? 500 : 800, lineHeight: 1.05, color: t, marginTop: 8, letterSpacing: app.tituloSerif ? -0.3 : -0.8 }}>{app.titulo}</div>
        </Bloque>
        <Bloque p={p} inicio={0.24} fin={0.45} color={color} app={app} frame={frame} alto={96}>
          <div style={{ fontFamily: FT, fontSize: 16, fontWeight: 700, color: t, lineHeight: 1.15 }}>
            <span style={{ color: app.acento, fontFamily: FM, marginRight: 6 }}>1→</span>
            {app.pregunta1}
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} style={{ flex: 1, height: 36, borderRadius: 9, border: `1.5px solid ${n === 4 ? app.acento : alfa(t, 0.2)}`, background: n === 4 ? app.acento : 'transparent', color: n === 4 ? '#fff' : t, fontFamily: FM, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
            ))}
          </div>
        </Bloque>
        <Bloque p={p} inicio={0.49} fin={0.7} color={color} app={app} frame={frame} alto={78}>
          <div style={{ fontFamily: FT, fontSize: 16, fontWeight: 700, color: t }}>
            <span style={{ color: app.acento, fontFamily: FM, marginRight: 6 }}>2→</span>
            {app.pregunta2}
          </div>
          <div style={{ marginTop: 14, borderBottom: `2px solid ${app.acento}`, fontFamily: FT, fontSize: 15, color: app.tinta2, paddingBottom: 6 }}>nombre@correo.com</div>
        </Bloque>
        <Bloque p={p} inicio={0.74} fin={0.93} color={color} app={app} frame={frame} alto={50}>
          <div style={{ height: 50, borderRadius: 12, background: app.acento, color: '#fff', fontFamily: FT, fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {app.boton} <span style={{ fontFamily: FM }}>→</span>
          </div>
        </Bloque>
      </div>
    </div>
  )
}

// ─── Carril ────────────────────────────────────────────────────────────────────
const ANCHO_CARRIL = 420
const ALTO_CARRIL = 930
const PAD = 28

const Carril: React.FC<{
  r: Corredor
  frame: number
  desde: number
  min: (f: number) => number
  minFinal: number
  costoMax: number
  tLlega: number
  ganador: boolean
  difTexto: string
  t: typeof TEXTOS
}> = ({ r, frame, desde, min, minFinal, costoMax, tLlega, ganador, difTexto, t }) => {
  const m = min(frame)
  const mAntes = min(frame - 1)
  const p = clamp01(m / minFinal)
  const costo = (fr: number) => (r.costo * min(fr)) / minFinal
  const llego = frame >= tLlega
  const llegada = prog(frame, tLlega, 16)
  const flash = ganador ? interpolate(frame, [tLlega, tLlega + 2, tLlega + 7], [0, 0.85, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0

  const tickHora = tick(min, frame, 60)
  const tickCosto = tick(costo, frame, 100)
  const popFinal = llego ? Math.sin(Math.PI * clamp01((frame - tLlega) / 12)) : 0
  const escalaReloj = 1 + 0.035 * tickHora + (ganador ? 0.1 : 0.05) * popFinal

  // glow: vive mientras corre; el ganador estalla al llegar y queda alto
  const respira = 0.5 + 0.5 * Math.sin(frame / 7)
  const glow = llego ? (ganador ? 0.75 + 0.25 * (1 - llegada) + 0.1 * respira : 0.25) : 0.22 + 0.12 * respira
  const vivo = 0.55 + 0.45 * Math.sin(frame / 4)

  return (
    <div
      style={{
        width: ANCHO_CARRIL,
        height: ALTO_CARRIL,
        position: 'relative',
        borderRadius: 30,
        background: noche.tarjeta,
        border: `1.5px solid ${llego && ganador ? alfa(r.color, 0.9) : noche.linea}`,
        boxShadow: `0 0 ${40 + 50 * glow}px ${alfa(r.color, glow * 0.55)}, inset 0 0 ${30 * glow}px ${alfa(r.color, glow * 0.25)}`,
        overflow: 'hidden',
      }}
    >
      {/* el carril se «llena» desde abajo con el avance */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${p * 100}%`, background: `linear-gradient(to top, ${alfa(r.color, 0.16)}, ${alfa(r.color, 0.02)})`, borderTop: `1px solid ${alfa(r.color2, 0.35 * p)}` }} />

      {/* encabezado: marca + nombre + en vivo */}
      <div style={{ position: 'absolute', left: PAD, top: 26, right: PAD, display: 'flex', alignItems: 'center', gap: 12, ...entra(frame, desde + 6, 12) }}>
        <div style={{ filter: `drop-shadow(0 0 ${8 + 10 * glow}px ${alfa(r.color, 0.8)})` }}>
          <Marca tipo={r.marca || 'chispa'} color={r.color} color2={r.color2} tam={34} giro={llego ? 0 : frame * (r.marca === 'nudo' ? 2.2 : 1.6)} />
        </div>
        <div style={{ fontFamily: FT, fontWeight: 800, fontSize: 36, color: noche.texto, letterSpacing: -1, whiteSpace: 'nowrap' }}>{r.nombre}</div>
      </div>
      <div style={{ position: 'absolute', left: PAD, top: 76, display: 'flex', alignItems: 'center', gap: 8, fontFamily: FM, fontSize: 15, fontWeight: 700, color: r.color2, letterSpacing: 2, opacity: (1 - llegada) * entra(frame, desde + 8, 12).opacity }}>
        <div style={{ width: 9, height: 9, borderRadius: 9, background: r.color, opacity: vivo, boxShadow: `0 0 10px ${r.color}` }} />
        {t.enVivo}
      </div>
      {!ganador && llego && (
        <div style={{ position: 'absolute', left: PAD, top: 72, fontFamily: FM, fontSize: 17, fontWeight: 700, color: noche.texto2, letterSpacing: 1, ...entra(frame, tLlega, 12, 12) }}>{difTexto}</div>
      )}

      {/* cronómetro */}
      <div style={{ position: 'absolute', left: PAD, top: 112, fontFamily: FM, fontSize: 15, fontWeight: 700, color: noche.texto2, letterSpacing: 3, ...entra(frame, desde + 10, 12) }}>{t.tiempo}</div>
      <div style={{ position: 'absolute', left: PAD - 4, top: 136, ...entra(frame, desde + 12, 14) }}>
      <div
        style={{
          fontFamily: FM,
          fontWeight: 800,
          fontSize: 100,
          color: noche.meta,
          letterSpacing: -4,
          transform: `scale(${escalaReloj})`,
          transformOrigin: 'left center',
          filter: `drop-shadow(0 0 ${ganador && llego ? 22 : 12}px ${alfa(noche.meta, ganador && llego ? 0.75 : 0.4)})`,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <Reloj min={m} minAntes={mAntes} tam={100} />
        <span style={{ fontSize: 34, fontWeight: 700, marginLeft: 6, marginBottom: 20, color: alfa(noche.meta, 0.75), letterSpacing: 0 }}>h</span>
      </div>
      </div>

      {/* costo */}
      <div style={{ position: 'absolute', left: PAD, top: 268, fontFamily: FM, fontSize: 15, fontWeight: 700, color: noche.texto2, letterSpacing: 3, ...entra(frame, desde + 14, 12) }}>{t.costo}</div>
      <div style={{ position: 'absolute', left: PAD, top: 290, ...entra(frame, desde + 16, 14) }}>
        <div style={{ fontFamily: FM, fontWeight: 800, fontSize: 50, color: noche.texto, letterSpacing: -2, transform: `scale(${1 + 0.05 * tickCosto + 0.06 * popFinal})`, transformOrigin: 'left center', display: 'inline-block' }}>
          <span style={{ fontSize: 30, color: noche.texto2, letterSpacing: 0, marginRight: 4 }}>US$</span>
          {miles(costo(frame))}
        </div>
        <div style={{ fontFamily: FT, fontSize: 17, fontWeight: 500, color: noche.texto2, marginTop: -2 }}>{t.notaCosto}</div>
      </div>
      <div style={{ position: 'absolute', left: PAD, right: PAD, top: 378, height: 6, borderRadius: 6, background: noche.linea, overflow: 'hidden', opacity: entra(frame, desde + 18, 12).opacity }}>
        <div style={{ width: `${(costo(frame) / costoMax) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${r.color}, ${r.color2})`, boxShadow: `0 0 12px ${r.color}` }} />
      </div>

      {/* la app que se construye */}
      <div style={{ position: 'absolute', left: PAD, top: 410, ...entra(frame, desde + 18, 16, 40) }}>
        <MiniApp app={r.app} p={p} color={r.color} frame={frame} ancho={ANCHO_CARRIL - PAD * 2} alto={420} />
      </div>

      {/* progreso */}
      <div style={{ position: 'absolute', left: PAD, right: PAD, top: 852, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', ...entra(frame, desde + 22, 12) }}>
        <span style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, color: noche.texto2, letterSpacing: 3 }}>{t.progreso}</span>
        <span style={{ fontFamily: FM, fontSize: 24, fontWeight: 800, color: p >= 1 ? noche.texto : r.color2 }}>{Math.floor(p * 100)}%</span>
      </div>
      <div style={{ position: 'absolute', left: PAD, right: PAD, top: 886, height: 14, borderRadius: 14, background: noche.linea, opacity: entra(frame, desde + 22, 12).opacity }}>
        <div style={{ position: 'relative', width: `${p * 100}%`, height: '100%', borderRadius: 14, background: `linear-gradient(90deg, ${r.color}, ${r.color2})`, boxShadow: `0 0 ${14 + 16 * glow}px ${alfa(r.color, 0.8)}` }}>
          <div style={{ position: 'absolute', right: -4, top: -4, width: 22, height: 22, borderRadius: 22, background: '#fff', opacity: p > 0.01 && p < 1 ? 0.9 : 0, boxShadow: `0 0 16px ${r.color2}, 0 0 4px #fff` }} />
        </div>
      </div>

      {/* flash de llegada */}
      <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash, pointerEvents: 'none' }} />
    </div>
  )
}

// ─── Grano ─────────────────────────────────────────────────────────────────────
const Grano: React.FC<{ frame: number; opacidad?: number }> = ({ frame, opacidad = 0.05 }) => (
  <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: opacidad, pointerEvents: 'none' }}>
    <filter id="grano-carrera">
      <feTurbulence type="fractalNoise" baseFrequency={0.8} numOctaves={2} seed={Math.floor(frame / 2)} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#grano-carrera)" />
  </svg>
)

// ─── La pieza ──────────────────────────────────────────────────────────────────
export const Carrera: React.FC<CarreraProps> = ({ a, b, desde = 0, tLlegaA = desde + 120, tLlegaB = tLlegaA + 90, textos }) => {
  const frame = useCurrentFrame()
  const t = { ...TEXTOS, ...textos }
  const minA = aMin(a.tiempo)
  const minB = aMin(b.tiempo)
  const salida = desde + 20 // arrancan los cronómetros

  const minutosA = (f: number) => minA * corre(clamp01((f - salida) / Math.max(1, tLlegaA - salida)))
  // B va a la par (un poco detrás) hasta que A llega; luego el time-lapse se dispara.
  const ventaja = 0.86
  const minutosB = (f: number) => {
    if (f <= tLlegaA) return minA * ventaja * clamp01((f - salida) / Math.max(1, tLlegaA - salida))
    const b0 = minA * ventaja
    return b0 + (minB - b0) * acelera(clamp01((f - tLlegaA) / Math.max(1, tLlegaB - tLlegaA)))
  }
  const costoMax = Math.max(a.costo, b.costo)
  const difTexto = t.diferenciaB || `+${hhmm(minB - minA)} h`

  // Cámara: deriva lenta mientras corren; al llegar, empuje hacia el ganador.
  const deriva = interpolate(frame, [desde, tLlegaA], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const empuje = prog(frame, tLlegaA, 26)
  const escala = 1 + 0.012 * deriva + 0.055 * empuje
  const golpe = Math.sin(Math.PI * clamp01((frame - tLlegaA) / 8)) * 6

  // Insignia «LLEGÓ»
  const ins = prog(frame, tLlegaA + 2, 14)
  const metaFlash = interpolate(frame, [tLlegaA, tLlegaA + 3, tLlegaA + 18], [0, 1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const metaFlashB = interpolate(frame, [tLlegaB, tLlegaB + 3, tLlegaB + 14], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const metaEntra = entra(frame, desde, 14, -20)

  const xA = 70
  const xB = 530
  const top = 300

  return (
    <AbsoluteFill style={{ background: noche.fondo, overflow: 'hidden' }}>
      {/* radiales de cada herramienta en su esquina */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 12% 18%, ${alfa(a.color, 0.1 + 0.08 * empuje)} 0%, transparent 50%), radial-gradient(circle at 92% 82%, ${alfa(b.color, 0.1)} 0%, transparent 50%)`,
        }}
      />
      {/* retícula fina */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${alfa(noche.linea, 0.45)} 1px, transparent 1px), linear-gradient(90deg, ${alfa(noche.linea, 0.45)} 1px, transparent 1px)`,
          backgroundSize: '90px 90px',
          backgroundPosition: `0 ${(frame * 0.6) % 90}px`,
          maskImage: 'radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)',
        }}
      />

      <AbsoluteFill style={{ transform: `scale(${escala}) translateY(${golpe}px)`, transformOrigin: `${xA + ANCHO_CARRIL / 2}px ${top + 140}px` }}>
        {/* línea de meta */}
        <div style={{ position: 'absolute', left: 70, right: 130, top: 250, height: 16, borderRadius: 4, overflow: 'hidden', ...metaEntra }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `repeating-conic-gradient(${noche.meta} 0 25%, ${noche.fondo} 0 50%)`,
              backgroundSize: '16px 16px',
              backgroundPosition: `${-frame * 0.8}px 0`,
              opacity: 0.55 + 0.45 * Math.max(metaFlash, metaFlashB),
            }}
          />
        </div>
        <div style={{ position: 'absolute', right: 70, top: 246, fontFamily: FM, fontWeight: 800, fontSize: 20, letterSpacing: 3, color: noche.meta, textShadow: `0 0 ${10 + 20 * metaFlash}px ${alfa(noche.meta, 0.7)}`, ...metaEntra }}>{t.meta}</div>

        <div style={{ position: 'absolute', left: xA, top, ...entra(frame, desde, 16, 60) }}>
          <Carril r={a} frame={frame} desde={desde} min={minutosA} minFinal={minA} costoMax={costoMax} tLlega={tLlegaA} ganador difTexto="" t={t} />
        </div>
        <div style={{ position: 'absolute', left: xB, top, ...entra(frame, desde + 5, 16, 60) }}>
          <Carril r={b} frame={frame} desde={desde + 5} min={minutosB} minFinal={minB} costoMax={costoMax} tLlega={tLlegaB} ganador={false} difTexto={difTexto} t={t} />
        </div>

        {/* VS */}
        <div
          style={{
            position: 'absolute',
            left: 510 - 32,
            top: top + 210,
            width: 64,
            height: 64,
            borderRadius: 64,
            background: noche.fondo,
            border: `1.5px solid ${noche.linea}`,
            color: noche.texto,
            fontFamily: FT,
            fontWeight: 900,
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: -0.5,
            ...entra(frame, desde + 10, 12, 0),
            transform: `scale(${0.6 + 0.4 * prog(frame, desde + 10, 14)})`,
          }}
        >
          {t.vs}
        </div>

        {/* insignia LLEGÓ */}
        {frame >= tLlegaA && (
          <div
            style={{
              position: 'absolute',
              left: xA + ANCHO_CARRIL - 205,
              top: top - 62,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px 10px 12px',
              borderRadius: 999,
              background: noche.meta,
              color: noche.fondo,
              fontFamily: FT,
              fontWeight: 900,
              fontSize: 32,
              letterSpacing: -0.5,
              boxShadow: `0 0 ${30 + 30 * (1 - ins)}px ${alfa(noche.meta, 0.75)}, 0 10px 30px rgba(0,0,0,0.5)`,
              opacity: ins,
              filter: `blur(${(1 - ins) * 10}px)`,
              transform: `rotate(${-8 + 3 * ins}deg) scale(${1.6 - 0.6 * ins})`,
              transformOrigin: 'center',
            }}
          >
            <Bandera tam={34} />
            {t.llego}
          </div>
        )}
      </AbsoluteFill>

      <Grano frame={frame} />
    </AbsoluteFill>
  )
}
