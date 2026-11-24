import React from 'react'
import { AbsoluteFill, Composition, registerRoot } from 'remotion'
import { Fondo } from '../kit'
import { S4Cta } from './S4Cta'

const Prueba: React.FC = () => (
  <AbsoluteFill>
    <Fondo />
    <S4Cta />
  </AbsoluteFill>
)

registerRoot(() => <Composition id="P001S4" component={Prueba} durationInFrames={151} fps={30} width={1080} height={1920} />)
