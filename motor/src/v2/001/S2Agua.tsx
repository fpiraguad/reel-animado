import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { N, Kicker, Tarjeta, p, pop, entra, sale, enEscena, deriva, mezcla, hex, contar } from '../kit'
import type { TipoSonido } from '../sonido'
import { C, Titular, Vapor, Taza, Sello, mezclaHex } from './comun'

// S2 · Agua hirviendo — t0 4,40 · t1 8,38 (119 f).
const T0 = 4.4
const T = (s: number) => enEscena(s, T0)
export const DUR_S2 = 119

const F = { uno: T(4.52), agua: T(4.8), hirviendo: T(5.08), quema: T(5.7), cafe: T(6.28), espera: T(6.63), treinta: T(7.05), segundos: T(7.54) }

export const SFX_S2: { f: number; tipo: TipoSonido; vol?: number }[] = [
  { f: F.uno, tipo: 'pop' },
  { f: F.hirviendo - 4, tipo: 'riser', vol: 0.09 },
  { f: F.quema, tipo: 'error' },
  { f: F.cafe, tipo: 'sello' },
  { f: F.espera, tipo: 'whoosh' },
  { f: F.treinta, tipo: 'tick' },
  { f: F.treinta + 6, tipo: 'tick' },
  { f: F.treinta + 12, tipo: 'tick' },
  { f: F.segundos, tipo: 'exito' },
]

/** Hervidor propio con burbujas en la ventanita. `hierve` 0–1. */
const Hervidor: React.FC<{ f: number; hierve: number }> = ({ f, hierve }) => {
  const burbujas = Array.from({ length: 9 }, (_, i) => {
    const ciclo = 26 + (i % 4) * 5
    const t = ((f * (0.6 + hierve) + i * 11) % ciclo) / ciclo
    return { x: 132 + ((i * 37) % 70), y: 330 - t * 150, r: 5 + (i % 3) * 3, o: hierve * (1 - t) }
  })
  const agua = mezclaHex(C.agua, C.calor, hierve)
  return (
    <svg width={340} height={420} viewBox="0 0 340 420" style={{ overflow: 'visible' }}>
      {/* asa */}
      <path d="M 250 120 C 330 120, 330 330, 250 330" fill="none" stroke="#2E2E3A" strokeWidth={30} strokeLinecap="round" />
      {/* pico */}
      <path d="M 70 150 L 10 110 L 22 98 L 80 130 Z" fill="#3A3A48" />
      {/* cuerpo */}
      <path d="M 70 90 L 250 90 L 270 380 Q 270 400 250 400 L 70 400 Q 50 400 50 380 Z" fill="#3A3A48" />
      <path d="M 200 90 L 250 90 L 270 380 Q 270 400 250 400 L 215 400 Z" fill="#2B2B36" />
      {/* tapa */}
      <rect x={90} y={64} width={140} height={30} rx={12} fill="#4A4A5A" />
      <rect x={140} y={44} width={40} height={24} rx={8} fill="#4A4A5A" />
      {/* ventanita de agua */}
      <rect x={120} y={170} width={90} height={190} rx={22} fill={N.fondo} />
      <rect x={120} y={200} width={90} height={160} rx={22} fill={agua} opacity={0.75} />
      {burbujas.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="#FFFFFF" opacity={b.o * 0.8} />
      ))}
      {/* base */}
      <rect x={40} y={398} width={240} height={22} rx={10} fill="#22222C" />
      <circle cx={250} cy={409} r={6} fill={hierve > 0.5 ? C.calor : N.ok} />
    </svg>
  )
}

/** Termómetro vertical: `t` en °C (20–100). */
const Termometro: React.FC<{ t: number; banda: number }> = ({ t, banda }) => {
  const y = (c: number) => 470 - ((c - 20) / 80) * 400
  const col = t > 96.5 ? C.calor : banda > 0.5 ? C.agua : N.texto2
  return (
    <svg width={120} height={540} viewBox="0 0 120 540">
      <rect x={40} y={50} width={40} height={440} rx={20} fill={N.tarjeta2} stroke={N.linea} strokeWidth={3} />
      {/* franja ideal 90–96 */}
      <rect x={30} y={y(96)} width={60} height={y(90) - y(96)} rx={8} fill={C.agua} opacity={0.25 + 0.6 * banda} />
      <rect x={50} y={y(t)} width={20} height={490 - y(t)} rx={10} fill={col} />
      <circle cx={60} cy={492} r={34} fill={col} />
      {[20, 40, 60, 80, 100].map((c) => (
        <rect key={c} x={88} y={y(c) - 2} width={18} height={4} rx={2} fill={N.texto3} />
      ))}
    </svg>
  )
}

export const S2Agua: React.FC<{ portada?: boolean }> = ({ portada }) => {
  const actual = useCurrentFrame()
  const f = portada ? DUR_S2 - 1 : actual
  const zoom = mezcla(1, 1.045, interpolate(f, [0, DUR_S2], [0, 1], { extrapolateRight: 'clamp' }))
  const d = deriva(f, 2, 4)

  const subir = p(f, F.uno, F.hirviendo + 10 - F.uno)
  const calmar = p(f, F.treinta, F.segundos - F.treinta + 4)
  const temp = mezcla(mezcla(62, 100, subir), 93, calmar)
  const hierve = subir * (1 - calmar)
  const banda = p(f, F.treinta + 6, 12)

  // chorro y taza quemada
  const chorro = p(f, F.quema - 6, 8) * (1 - p(f, F.cafe + 4, 8))
  const quemado = p(f, F.quema, 16)
  const sacudir = f >= F.quema && f < F.quema + 14 ? Math.sin(f * 2.1) * 6 * (1 - (f - F.quema) / 14) : 0

  // cuenta regresiva 30 → 0 comprimida entre «Espera» y «segundos»
  const cuenta = Math.ceil(30 - contar(f, F.espera + 4, F.segundos - F.espera - 4, 30))
  const anillo = p(f, F.espera + 4, F.segundos - F.espera - 4)
  const verCuenta = p(f, F.espera, 10)

  const cambio = f >= F.espera
  return (
    <AbsoluteFill style={{ transform: `translate(${d.x}px, ${d.y}px) scale(${zoom})`, transformOrigin: '510px 820px' }}>
      <div style={{ position: 'absolute', left: 80, top: 252, ...entra(f, 0, 10, 14) }}>
        <Kicker texto="Error 1" color={C.calor} />
      </div>
      <div style={{ position: 'absolute', left: 76, top: 316, ...(cambio ? sale(f, F.espera, 6) : {}) }}>
        <Titular
          f={f}
          size={120}
          lineas={[[[F.uno, 'Agua']], [[F.hirviendo, 'hirviendo', C.calor]]]}
        />
      </div>
      {cambio ? (
        <div style={{ position: 'absolute', left: 76, top: 316 }}>
          <Titular f={f} size={120} lineas={[[[F.espera + 4, 'Espera']], [[F.treinta, '30', C.agua], [F.segundos, 'segundos']]]} />
        </div>
      ) : null}

      {/* hervidor */}
      <div style={{ position: 'absolute', left: 70, top: 720, ...entra(f, 2, 12, 30) }}>
        <div style={{ transform: 'scale(1.15)', transformOrigin: '0 0' }}>
        <Vapor f={f} x={30} y={110} ancho={180} fuerza={0.3 + 1.2 * hierve} />
        <div style={{ transform: `translateX(${hierve > 0.8 ? Math.sin(f * 3.1) * 2 : 0}px)` }}>
          <Hervidor f={f} hierve={hierve} />
        </div>
        </div>
      </div>

      {/* chorro a la taza */}
      {chorro > 0 ? (
        <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
          <path d="M 92 860 C 60 930, 470 880, 520 1050" fill="none" stroke={C.calor} strokeWidth={14} strokeLinecap="round" opacity={0.8 * chorro} strokeDasharray="600" strokeDashoffset={600 * (1 - chorro)} />
        </svg>
      ) : null}

      {/* taza que se quema */}
      <div style={{ position: 'absolute', left: 0, top: 0, opacity: p(f, F.quema - 8, 10) * (1 - p(f, F.espera, 8)), transform: `translateX(${sacudir}px)` }}>
        <Vapor f={f} x={520} y={1020} ancho={150} fuerza={0.6 + quemado} color={quemado > 0.5 ? '#FFB29E' : '#FFFFFF'} />
        <Taza x={420} y={1030} w={190} tono={quemado} />
        <div style={{ position: 'absolute', left: 380, top: 930 }}>
          <Sello f={f} en={F.cafe} texto="Quemado" color={N.rojo} size={40} />
        </div>
      </div>

      {/* cuenta regresiva */}
      {cambio ? (
        <div style={{ position: 'absolute', left: 458, top: 930, opacity: verCuenta, transform: `scale(${pop(f, F.espera, 12)})` }}>
          <svg width={240} height={240} viewBox="0 0 240 240">
            <circle cx={120} cy={120} r={100} fill={N.tarjeta} stroke={N.linea} strokeWidth={14} />
            <circle
              cx={120}
              cy={120}
              r={100}
              fill="none"
              stroke={C.agua}
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={628}
              strokeDashoffset={628 * anillo}
              transform="rotate(-90 120 120)"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: N.fMono, fontWeight: 800, fontSize: 72, color: N.texto }}>
            0:{String(Math.max(0, cuenta)).padStart(2, '0')}
          </div>
        </div>
      ) : null}

      {/* termómetro + lectura */}
      <div style={{ position: 'absolute', left: 700, top: 690, ...entra(f, 4, 12, 30) }}>
        <Tarjeta glow={temp > 96.5 ? C.calor : banda > 0.5 ? C.agua : undefined} fuerza={0.7} style={{ width: 250, height: 460, display: 'flex', justifyContent: 'center', paddingTop: 12, boxSizing: 'border-box' }}>
          <div style={{ transform: 'scale(0.8)', transformOrigin: '50% 0' }}>
            <Termometro t={temp} banda={banda} />
          </div>
        </Tarjeta>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 650,
          width: 350,
          top: 1166,
          textAlign: 'center',
          fontFamily: N.fMono,
          fontWeight: 800,
          fontSize: 64,
          color: temp > 96.5 ? C.calor : banda > 0.5 ? C.agua : N.texto,
          textShadow: `0 0 30px ${(temp > 96.5 ? C.calor : C.agua) + hex(0.45)}`,
          ...entra(f, 4, 12, 20),
        }}
      >
        {Math.round(temp)} °C
      </div>
      {banda > 0 ? (
        <div style={{ position: 'absolute', left: 470, top: 708, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, ...entra(f, F.treinta + 6, 12, 10) }}>
          <div style={{ fontFamily: N.fMono, fontWeight: 800, fontSize: 40, color: C.agua }}>90–96 °C</div>
          <Sello f={f} en={F.segundos} texto="Ideal" color={N.ok} size={40} giro={4} />
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
