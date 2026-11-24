import React from 'react'
import { Composition, registerRoot } from 'remotion'

import { usarEstilo } from '../tema'
import { TablaRevela } from './TablaRevela'

// Prueba (9 s): dos agentes inventados, A contra B.
const Prueba: React.FC = () => {
  usarEstilo('suizo')
  return (
    <TablaRevela
      a={{ nombre: 'Agente A', color: '#F97316' }}
      b={{ nombre: 'Agente B', color: '#3B82F6' }}
      filas={[
        { criterio: 'Diseño y pruebas', gana: 'b', t: 30 },
        { criterio: 'Funciona de punta a punta', gana: 'a', t: 75 },
        { criterio: 'Tiempo', a: '5 h 32 min', b: '61 h 47 min', gana: 'a', t: 120 },
        { criterio: 'Costo (equiv. API)', a: 'US$832', b: 'US$2.932', gana: 'a', t: 165 },
      ]}
      marcador="3 – 1"
      veredicto="En esta tarea, ganó Agente A"
      tVeredicto={218}
    />
  )
}

const Root: React.FC = () => (
  <Composition id="PruebaTablaRevela" component={Prueba} durationInFrames={270} fps={30} width={1080} height={1920} />
)

registerRoot(Root)
