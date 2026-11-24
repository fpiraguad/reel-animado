import React from 'react'
import { Composition, registerRoot } from 'remotion'

import { usarEstilo } from '../tema'
import { Carrera, type CarreraProps } from './Carrera'

export const carreraEjemplo: CarreraProps = {
  a: {
    nombre: 'Agente A',
    color: '#F97316',
    color2: '#FDBA74',
    marca: 'chispa',
    tiempo: '5:32',
    costo: 832,
    app: {
      nombre: 'Formora',
      url: 'formora.app',
      fondo: '#F4F1EA',
      tinta: '#141413',
      tinta2: '#6B6A65',
      acento: '#C2410C',
      titulo: 'Planeemos un lanzamiento',
      pregunta1: '¿Qué tan probable es que nos recomiendes?',
      pregunta2: '¿Cuál es tu correo?',
      boton: 'Enviar',
      tituloSerif: true,
    },
  },
  b: {
    nombre: 'Agente B',
    color: '#3B82F6',
    color2: '#93C5FD',
    marca: 'nudo',
    tiempo: '61:47',
    costo: 2932,
    app: {
      nombre: 'Rillform',
      url: 'rillform.app',
      fondo: '#FFFFFF',
      tinta: '#16161D',
      tinta2: '#70707C',
      acento: '#6D4AFF',
      titulo: '¿Qué tan de acuerdo estás?',
      pregunta1: 'El onboarding fue fácil de entender',
      pregunta2: '¿Dónde te enviamos el resumen?',
      boton: 'Enviar respuestas',
    },
  },
  desde: 0,
  tLlegaA: 120,
  tLlegaB: 220,
}

const Prueba: React.FC = () => {
  usarEstilo('suizo')
  return <Carrera {...carreraEjemplo} />
}

const RootPrueba: React.FC = () => <Composition id="PruebaCarrera" component={Prueba} durationInFrames={270} fps={30} width={1080} height={1920} />

registerRoot(RootPrueba)
