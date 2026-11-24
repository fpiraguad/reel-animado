import React from 'react'
import { AbsoluteFill, Composition, Sequence, registerRoot, useCurrentFrame } from 'remotion'

import { c, entra, f, usarEstilo } from '../tema'
import { Juego, type TipoJuego } from './Juego'

// Prueba: los tres juegos en secuencia (~3 s cada uno); el primero se genera.
const TRAMOS: { tipo: TipoJuego; desde: number; dur: number; generar?: boolean }[] = [
  { tipo: 'saltador', desde: 0, dur: 120, generar: true },
  { tipo: 'serpiente', desde: 120, dur: 90 },
  { tipo: 'ladrillos', desde: 210, dur: 90 },
]

const AN = 640
const AL = 900

const Celular: React.FC<{ tipo: TipoJuego; generar?: boolean; n: number }> = ({ tipo, generar, n }) => {
  const frame = useCurrentFrame()
  return (
    <>
      <div style={{ position: 'absolute', left: 220, top: 250, fontFamily: f.mono, fontSize: 26, color: c.tinta, letterSpacing: '0.08em', ...entra(frame, 0, 10) }}>
        JUEGO 0{n} · {tipo.toUpperCase()}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 300,
          padding: 20,
          background: '#0a0a0a',
          borderRadius: 56,
          boxShadow: '0 30px 80px rgba(0,0,0,0.18)',
          ...entra(frame, 0, 10, 40),
        }}
      >
        <div style={{ borderRadius: 38, overflow: 'hidden' }}>
          <Juego tipo={tipo} desde={0} ancho={AN} alto={AL} generar={generar} />
        </div>
      </div>
    </>
  )
}

const Prueba: React.FC = () => {
  usarEstilo('suizo')
  return (
    <AbsoluteFill
      style={{
        background: c.papel,
        backgroundImage: `linear-gradient(${c.papel2} 1.5px, transparent 1.5px), linear-gradient(90deg, ${c.papel2} 1.5px, transparent 1.5px)`,
        backgroundSize: '90px 90px',
      }}
    >
      {TRAMOS.map((tr, i) => (
        <Sequence key={tr.tipo} from={tr.desde} durationInFrames={tr.dur}>
          <Celular tipo={tr.tipo} generar={tr.generar} n={i + 1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

const Root: React.FC = () => (
  <Composition id="PruebaJuego" component={Prueba} durationInFrames={300} fps={30} width={1080} height={1920} />
)

registerRoot(Root)
