import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { ArrowUp, Check, Thermometer, Coffee, Scale } from 'lucide-react'
import { N, Kicker, Tarjeta, Cursor, rutaCursor, p, pop, entra, enEscena, deriva, mezcla, hex, tecleo } from '../kit'
import type { TipoSonido } from '../sonido'
import { C, Titular } from './comun'

// S4 · CTA — t0 14,96 · t1 20,00 (151 f). Todo quieto desde el frame 105.
const T0 = 14.96
const T = (s: number) => enEscena(s, T0)
export const DUR_S4 = 151

const F = { comenta: T(15.07), cafe: T(15.56), clic: T(15.56) + 14, mando: T(16.31), guia: T(16.89), medidas: T(17.63) }

export const SFX_S4: { f: number; tipo: TipoSonido; vol?: number }[] = [
  { f: F.comenta, tipo: 'pop' },
  { f: F.cafe - 2, tipo: 'teclas', vol: 0.1 },
  { f: F.clic, tipo: 'click' },
  { f: F.mando, tipo: 'pop' },
  { f: F.guia, tipo: 'tick' },
  { f: F.guia + 8, tipo: 'tick' },
  { f: F.guia + 16, tipo: 'tick' },
  { f: F.medidas + 6, tipo: 'exito' },
]

const FILAS = [
  { Ic: Thermometer, t: 'Agua a 90–96 °C', col: C.agua },
  { Ic: Coffee, t: 'Muele al momento', col: C.cafe },
  { Ic: Scale, t: '1 g café : 16 g agua', col: N.meta },
]

export const S4Cta: React.FC<{ portada?: boolean }> = ({ portada }) => {
  const actual = useCurrentFrame()
  const f = portada ? DUR_S4 - 1 : actual
  // la cámara se aquieta para el último 1,5 s
  const quieto = 1 - p(f, 90, 15)
  const zoom = mezcla(1, 1.03, interpolate(f, [0, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  const dd = deriva(f, 4, 4)
  const d = { x: dd.x * quieto, y: dd.y * quieto }

  const escrito = f >= F.cafe ? tecleo('CAFÉ', f, F.cafe, 22) : ''
  const enviado = f >= F.clic
  const presion = 1 - 0.14 * Math.sin(Math.min(1, Math.max(0, (f - F.clic) / 7)) * Math.PI)
  const cur = rutaCursor(f, [
    [F.cafe - 4, 1000, 1150],
    [F.clic - 3, 878, 668],
    [F.clic + 5, 878, 668],
    [F.clic + 22, 1010, 1100],
  ])
  const curOp = p(f, F.cafe - 4, 8) * (1 - p(f, F.clic + 10, 10))

  return (
    <AbsoluteFill style={{ transform: `translate(${d.x}px, ${d.y}px) scale(${zoom})`, transformOrigin: '510px 800px' }}>
      <div style={{ position: 'absolute', left: 80, top: 252, ...entra(f, 0, 10, 14) }}>
        <Kicker texto="Gratis" color={N.meta} />
      </div>
      <Titular
        f={f}
        size={124}
        style={{ position: 'absolute', left: 76, top: 316 }}
        lineas={[[[0, 'Comenta']], [[F.cafe, 'CAFÉ', N.meta]]]}
      />

      {/* caja de comentario */}
      <div style={{ position: 'absolute', left: 80, top: 600, ...entra(f, 4, 12, 24) }}>
        <Tarjeta glow={enviado ? N.meta : undefined} fuerza={0.4} style={{ width: 860, height: 120, display: 'flex', alignItems: 'center', gap: 22, padding: '0 26px', boxSizing: 'border-box', borderRadius: 999 }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: `linear-gradient(135deg, ${C.cafe}, ${N.meta})`, flexShrink: 0 }} />
          <div style={{ flex: 1, fontFamily: N.fTexto, fontWeight: escrito ? 900 : 600, fontSize: escrito ? 56 : 40, color: escrito ? N.texto : N.texto3, letterSpacing: escrito ? 1 : -0.4 }}>
            {escrito || 'Añade un comentario…'}
            {!enviado && f >= F.cafe - 4 && Math.floor(f / 8) % 2 === 0 ? <span style={{ display: 'inline-block', width: 4, height: 50, background: N.meta, marginLeft: 6, verticalAlign: -6 }} /> : null}
          </div>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              background: enviado ? N.ok : escrito ? N.meta : N.tarjeta2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${presion})`,
              flexShrink: 0,
            }}
          >
            {enviado ? <Check size={46} strokeWidth={3.4} color={N.fondo} /> : <ArrowUp size={46} strokeWidth={3.2} color={escrito ? N.fondo : N.texto3} />}
          </div>
        </Tarjeta>
      </div>

      {/* DM con el recurso */}
      {f >= F.mando - 2 ? (
        <div style={{ position: 'absolute', left: 80, top: 750, ...entra(f, F.mando, 14, 50) }}>
          <Tarjeta style={{ width: 860, padding: '20px 28px 22px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: `linear-gradient(135deg, ${C.agua}, ${C.cafe})` }} />
              <div style={{ fontFamily: N.fTexto, fontWeight: 800, fontSize: 38, color: N.texto }}>Mensaje nuevo</div>
              <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: 9, background: N.rojo, boxShadow: `0 0 16px ${N.rojo}` }} />
            </div>
            <div
              style={{
                marginTop: 12,
                display: 'inline-block',
                padding: '10px 22px',
                borderRadius: '26px 26px 26px 8px',
                background: N.tarjeta2,
                fontFamily: N.fTexto,
                fontWeight: 600,
                fontSize: 38,
                color: N.texto,
                transform: `scale(${pop(f, F.mando + 6, 12)})`,
                transformOrigin: '0 50%',
              }}
            >
              ¡Aquí tienes tu guía!
            </div>
            <div style={{ marginTop: 12, borderRadius: 22, border: `2px solid ${N.meta}${hex(0.5)}`, background: `${N.meta}${hex(0.06)}`, padding: '14px 22px', ...entra(f, F.guia - 4, 12, 18) }}>
              <div style={{ fontFamily: N.fTexto, fontWeight: 900, fontSize: 42, color: N.meta, letterSpacing: -0.6 }}>Guía: medidas del café</div>
              {FILAS.map(({ Ic, t, col }, i) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 10, ...entra(f, F.guia + 4 + i * 8, 10, 12) }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${col}${hex(0.18)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic size={34} color={col} strokeWidth={2.6} />
                  </div>
                  <div style={{ fontFamily: N.fTexto, fontWeight: 700, fontSize: 38, color: N.texto }}>{t}</div>
                </div>
              ))}
            </div>
          </Tarjeta>
        </div>
      ) : null}

      {curOp > 0 && !portada ? (
        <div style={{ opacity: curOp }}>
          <Cursor x={cur.x} y={cur.y} clics={[F.clic]} />
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
