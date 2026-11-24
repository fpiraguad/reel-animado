import React from 'react'
import { AbsoluteFill, Composition, registerRoot } from 'remotion'
import { Fondo } from '../kit'
import { S3Molienda } from './S3Molienda'

const Prueba: React.FC = () => (
  <AbsoluteFill>
    <Fondo />
    <S3Molienda />
  </AbsoluteFill>
)

registerRoot(() => <Composition id="P001S3" component={Prueba} durationInFrames={198} fps={30} width={1080} height={1920} />)
