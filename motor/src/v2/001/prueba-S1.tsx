import React from 'react'
import { AbsoluteFill, Composition, registerRoot } from 'remotion'
import { Fondo } from '../kit'
import { S1Gancho } from './S1Gancho'

const Prueba: React.FC = () => (
  <AbsoluteFill>
    <Fondo />
    <S1Gancho />
  </AbsoluteFill>
)

registerRoot(() => <Composition id="P001S1" component={Prueba} durationInFrames={132} fps={30} width={1080} height={1920} />)
