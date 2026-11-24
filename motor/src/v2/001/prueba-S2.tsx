import React from 'react'
import { AbsoluteFill, Composition, registerRoot } from 'remotion'
import { Fondo } from '../kit'
import { S2Agua } from './S2Agua'

const Prueba: React.FC = () => (
  <AbsoluteFill>
    <Fondo />
    <S2Agua />
  </AbsoluteFill>
)

registerRoot(() => <Composition id="P001S2" component={Prueba} durationInFrames={119} fps={30} width={1080} height={1920} />)
