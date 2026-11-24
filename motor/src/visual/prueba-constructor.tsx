import React from 'react'
import { AbsoluteFill, Composition, registerRoot } from 'remotion'

import { c, usarEstilo } from '../tema'
import { Constructor } from './Constructor'

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
      <Constructor
        prompt="Hazme una app de pedidos para mi panadería, con menú y botón para pedir"
        pasos={['Creando pantallas', 'Conectando base de datos', 'Publicando']}
        url="la-espiga.constructoria.app"
        tEscribir={18}
        tEnviar={110}
        tConstruir={124}
        tClick={242}
      />
    </AbsoluteFill>
  )
}

const RootPrueba: React.FC = () => (
  <Composition id="PruebaConstructor" component={Prueba} durationInFrames={285} fps={30} width={1080} height={1920} />
)

registerRoot(RootPrueba)
