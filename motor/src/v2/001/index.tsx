// GENERADO por scripts/indice-v2.mjs 001 — no editar a mano (cambia el brief o estilo.json).
import React from 'react'
import { Composition, registerRoot } from 'remotion'
import narracion from '../../../public/voz/001-demo/narracion.json'
import { ReelV2, ConfigReel, duracionReel, Palabra } from '../Ensamble'
import { MUSICA } from '../sonido'
import { S1Gancho, SFX_S1 } from './S1Gancho'
import { S2Agua, SFX_S2 } from './S2Agua'
import { S3Molienda, SFX_S3 } from './S3Molienda'
import { S4Cta, SFX_S4 } from './S4Cta'


export const config: ConfigReel = {
  id: '001-demo',
  voz: 'voz/001-demo/narracion.mp3',
  palabras: (narracion as { palabras: Palabra[] }).palabras,
  fin: 20,
  musica: MUSICA['001'],

  escenas: [
    { id: 'S1', C: S1Gancho, t0: 0, t1: 4.4, sfx: SFX_S1 },
    { id: 'S2', C: S2Agua, t0: 4.4, t1: 8.38, sfx: SFX_S2 },
    { id: 'S3', C: S3Molienda, t0: 8.38, t1: 14.96, sfx: SFX_S3 },
    { id: 'S4', C: S4Cta, t0: 14.96, t1: 20, sfx: SFX_S4 },
  ],
}

const Root: React.FC = () => (
  <>
    <Composition id="Reel001v2" component={() => <ReelV2 c={config} />} durationInFrames={duracionReel(config)} fps={30} width={1080} height={1920} />
    <Composition id="Reel001v2Portada" component={() => <ReelV2 c={config} portada />} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
)

registerRoot(Root)
