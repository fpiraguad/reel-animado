import React from 'react'
import { AbsoluteFill, Composition, Sequence, registerRoot, useCurrentFrame } from 'remotion'
import { Check, MousePointer2 } from 'lucide-react'

import { c, entra, f, prog, usarEstilo } from '../tema'
import { Camara, Destello, IconosFlotantes, Sfx, Transicion } from './Movimiento'

const ESC = 60 // 4 escenas de 2 s = 8 s

// Colores de ejemplo (marcas inventadas).
const ROSA = '#EC4899'
const VERDE = '#16A34A'
const NARANJA = '#F97316'

const Reticula: React.FC = () => (
  <AbsoluteFill
    style={{
      background: c.papel,
      backgroundImage: `linear-gradient(${c.papel2} 1.5px, transparent 1.5px), linear-gradient(90deg, ${c.papel2} 1.5px, transparent 1.5px)`,
      backgroundSize: '90px 90px',
    }}
  />
)

const Rotulo: React.FC<{ t: string }> = ({ t }) => (
  <div style={{ position: 'absolute', left: 90, top: 260, fontFamily: f.mono, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: c.tinta2 }}>{t}</div>
)

/** Tarjeta de «app» de muestra (el producto sí lleva color). */
const App: React.FC<{ x: number; y: number; w: number; h: number; color: string; titulo: string }> = ({ x, y, w, h, color, titulo }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: '#fff', border: `3px solid ${c.tinta}`, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,.12)' }}>
    <div style={{ height: 70, background: color, display: 'flex', alignItems: 'center', padding: '0 26px', gap: 12 }}>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: 'rgba(255,255,255,.7)' }} />)}
    </div>
    <div style={{ padding: 34, fontFamily: f.texto, fontWeight: 800, fontSize: 54, letterSpacing: -2, color: c.tinta }}>{titulo}</div>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ margin: '0 34px 22px', height: 26, width: `${80 - i * 18}%`, background: c.papel2 }} />
    ))}
  </div>
)

const EscenaIconos: React.FC = () => (
  <Camara tipo="empuje" foco={[540, 760]} desde={4} hasta={ESC} escalaHasta={1.12}>
    <Rotulo t="CÁMARA · EMPUJE  +  ÍCONOS" />
    <App x={290} y={560} w={500} h={400} color={ROSA} titulo="Mi tienda" />
    <IconosFlotantes
      centro={[540, 760]}
      radio={[380, 330]}
      desde={6}
      paso={4}
      iconos={[{ nombre: 'shopping-cart', color: ROSA }, 'credit-card', { nombre: 'sparkles', color: NARANJA }, 'package', { nombre: 'message-circle', color: VERDE }]}
    />
  </Camara>
)

const EscenaListo: React.FC = () => {
  const frame = useCurrentFrame()
  const toque = 22
  const listo = 28
  const pt = prog(frame, 4, 16)
  const hecho = frame >= listo
  const pulso = prog(frame, toque, 10)
  return (
    <Camara tipo="zoom" foco={[540, 780]}>
      <Rotulo t="CLICK  +  DESTELLO DE LISTO" />
      <div
        style={{
          position: 'absolute', left: 240, top: 700, width: 600, height: 150,
          background: hecho ? VERDE : c.tinta, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
          fontFamily: f.texto, fontWeight: 800, fontSize: 58, letterSpacing: -2,
          transform: `scale(${frame >= toque && frame < toque + 5 ? 0.95 : hecho ? 1 + 0.04 * (1 - prog(frame, listo, 12)) : 1})`,
        }}
      >
        {hecho ? <><Check size={64} strokeWidth={3} /> Listo</> : 'Publicar'}
      </div>
      {/* Toque: cursor que llega y onda */}
      <div style={{ position: 'absolute', left: 780 - 220 * pt, top: 1000 - 180 * pt }}>
        <MousePointer2 size={90} fill={c.tinta} color={c.papel} strokeWidth={1.5} />
      </div>
      {frame >= toque ? (
        <div style={{ position: 'absolute', left: 560 - 70 * pulso, top: 820 - 70 * pulso, width: 140 * pulso, height: 140 * pulso, borderRadius: 999, border: `4px solid ${c.tinta}`, opacity: 1 - pulso }} />
      ) : null}
      <Sfx tipo="click" frame={toque} />
      <Destello desde={listo} caja={{ x: 240, y: 700, w: 600, h: 150 }} />
    </Camara>
  )
}

const EscenaPaneo: React.FC = () => (
  <Camara tipo="paneo" paneo={[-90, 0]}>
    <Rotulo t="CÁMARA · PANEO" />
    <div style={{ position: 'absolute', left: 90, top: 560, width: 900, fontFamily: f.display, fontWeight: 800, fontSize: 150, letterSpacing: -7, lineHeight: 0.95, color: c.tinta, ...entra(useCurrentFrame(), 2) }}>
      Nada<br />queda<br />quieto.
    </div>
  </Camara>
)

const EscenaDeriva: React.FC = () => (
  <Camara tipo="deriva">
    <Rotulo t="CÁMARA · DERIVA  +  ÍCONOS NEGROS" />
    <div style={{ position: 'absolute', left: 390, top: 640, width: 300, height: 300, borderRadius: 999, background: NARANJA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: f.texto, fontWeight: 800, fontSize: 56, color: '#fff' }}>IA</div>
    <IconosFlotantes centro={[540, 790]} radio={300} tam={110} desde={6} paso={4} angulo={-90} iconos={['code', 'terminal', 'bot', 'zap']} />
  </Camara>
)

const ESCENAS: { C: React.FC; entrada: 'barrido' | 'zoom' | 'deslizar' | null; salida: 'barrido' | 'zoom' | 'deslizar' | null }[] = [
  { C: EscenaIconos, entrada: null, salida: 'barrido' },
  { C: EscenaListo, entrada: 'barrido', salida: 'zoom' },
  { C: EscenaPaneo, entrada: 'zoom', salida: 'deslizar' },
  { C: EscenaDeriva, entrada: 'deslizar', salida: null },
]

const Prueba: React.FC = () => {
  usarEstilo('suizo')
  return (
    <AbsoluteFill style={{ background: c.papel }}>
      <Reticula />
      {ESCENAS.map(({ C, entrada, salida }, i) => (
        <Sequence key={i} from={i * ESC} durationInFrames={ESC} name={`escena-${i}`}>
          <Transicion frames={ESC} entrada={entrada} salida={salida}>
            <C />
          </Transicion>
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

registerRoot(() => (
  <Composition id="PruebaMovimiento" component={Prueba} durationInFrames={ESC * 4} fps={30} width={1080} height={1920} />
))
