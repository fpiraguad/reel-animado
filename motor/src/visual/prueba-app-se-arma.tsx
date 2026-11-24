import React from 'react'
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from 'remotion'

import { c, entra, f, usarEstilo } from '../tema'
import { AppSeArma, type AppDef } from './AppSeArma'

/** Antetítulo con raya, solo para esta prueba. */
const Kicker: React.FC<{ texto: string; desde?: number }> = ({ texto, desde = 0 }) => {
  const frame = useCurrentFrame()
  return (
    <div style={{ ...entra(frame, desde), fontFamily: f.mono, fontWeight: 700, fontSize: 30, letterSpacing: 7, color: c.acento, display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ width: 34, height: 4, background: c.acento, display: 'inline-block' }} />
      {texto}
    </div>
  )
}

export const barberia: AppDef = {
  nombre: 'Barbería Don Juan',
  sub: 'Agenda',
  color: '#1F3A5F',
  emoji: '💈',
  bloques: [
    { tipo: 'saludo', titulo: 'Hola, Juan 👋', sub: 'Tienes 4 citas hoy' },
    {
      tipo: 'calendario',
      titulo: 'Miércoles 5',
      activo: 2,
      dias: [{ d: 'L', n: 3 }, { d: 'M', n: 4 }, { d: 'M', n: 5 }, { d: 'J', n: 6 }, { d: 'V', n: 7 }, { d: 'S', n: 8 }, { d: 'D', n: 9 }],
      citas: [
        { hora: '9:00', nombre: 'Carlos Ruiz', servicio: 'Corte + barba · 45 min' },
        { hora: '10:30', nombre: 'Andrés Mejía', servicio: 'Corte clásico · 30 min' },
        { hora: '2:00', nombre: 'Felipe Rojas', servicio: 'Afeitado navaja · 30 min' },
        { hora: '4:15', nombre: 'Mateo López', servicio: 'Corte niño · 25 min' },
      ],
    },
    { tipo: 'boton', texto: 'Reservar', icono: 'CalendarPlus' },
  ],
}

export const lupita: AppDef = {
  nombre: 'Tienda Lupita',
  sub: 'Inventario',
  color: '#E8590C',
  emoji: '🛒',
  bloques: [
    { tipo: 'stat', etiqueta: 'Vendido hoy', valor: '$1.240.000', cambio: '+18%', icono: 'TrendingUp' },
    { tipo: 'grafico', titulo: 'Ventas de la semana', forma: 'barras', valores: [620, 810, 540, 930, 760, 1120, 1240], etiquetas: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], resaltar: 6, marca: '$1,24 M', total: '$6,0 M' },
    {
      tipo: 'lista',
      titulo: 'Productos',
      accion: 'Ver todo',
      items: [
        { emoji: '🥛', titulo: 'Leche entera 1 L', sub: '48 unidades', valor: '$4.200' },
        { emoji: '🍞', titulo: 'Pan tajado', sub: '3 unidades', alerta: 'quedan 3' },
        { emoji: '🥚', titulo: 'Huevos AA x30', sub: '22 unidades', valor: '$16.900' },
        { emoji: '☕', titulo: 'Café molido 500 g', sub: '31 unidades', valor: '$13.500' },
      ],
    },
  ],
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
      <div style={{ position: 'absolute', left: 70, top: 250 }}>
        <Kicker texto="LA IA LA ARMA SOLA" desde={0} />
      </div>
      <AppSeArma app={barberia} desde={8} ritmo={14} escala={1.1} estilo={{ position: 'absolute', left: 70, top: 340 }} />
      <AppSeArma app={lupita} desde={40} ritmo={14} escala={1.1} estilo={{ position: 'absolute', left: 521, top: 340 }} />
    </AbsoluteFill>
  )
}

const Final: React.FC = () => {
  usarEstilo('suizo')
  return (
    <AbsoluteFill style={{ background: c.papel, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 22 }}>
      <AppSeArma app={barberia} soloFinal escala={1.1} />
      <AppSeArma app={lupita} soloFinal escala={1.1} />
    </AbsoluteFill>
  )
}

// Los tipos que no salen arriba (tarjetas, línea, ícono lucide): solo para revisar que pinten bien.
const gimnasio: AppDef = {
  nombre: 'Gym Titán',
  sub: 'Socios',
  color: '#7C3AED',
  icono: 'Dumbbell',
  bloques: [
    { tipo: 'saludo', titulo: 'Buen día, Laura', sub: 'Así va el mes' },
    { tipo: 'tarjetas', items: [{ etiqueta: 'Socios activos', valor: '312', icono: 'Users' }, { etiqueta: 'Renuevan hoy', valor: '9', emoji: '🔁' }] },
    { tipo: 'grafico', titulo: 'Asistencia', forma: 'linea', valores: [40, 62, 55, 78, 70, 96, 88], etiquetas: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], total: '+22%' },
    { tipo: 'boton', texto: 'Cobrar mensualidades', icono: 'Wallet' },
  ],
}

const Tipos: React.FC = () => {
  usarEstilo('suizo')
  return (
    <AbsoluteFill style={{ background: c.papel, alignItems: 'center', justifyContent: 'center' }}>
      <AppSeArma app={gimnasio} soloFinal escala={1.1} />
    </AbsoluteFill>
  )
}

const RootPrueba: React.FC = () => (
  <>
    <Composition id="PruebaAppSeArma" component={Prueba} durationInFrames={240} fps={30} width={1080} height={1920} />
    <Composition id="PruebaAppSeArmaFinal" component={Final} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="PruebaAppSeArmaTipos" component={Tipos} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
)

registerRoot(RootPrueba)
