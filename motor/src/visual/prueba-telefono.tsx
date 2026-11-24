import React from 'react'
import { AbsoluteFill, Composition, interpolate, registerRoot, useCurrentFrame } from 'remotion'
import { Check, Clock, Croissant, Wheat } from 'lucide-react'

import { c, entra, f, prog, usarEstilo } from '../tema'
import { Telefono } from './Telefono'

/** Titular palabra por palabra; lo que va entre *asteriscos* sale en el color de acento. Solo para esta prueba. */
const TextoAnimado: React.FC<{ texto: string; tam: number; desde?: number; alinear?: 'left' | 'center' }> = ({ texto, tam, desde = 0, alinear = 'left' }) => {
  const frame = useCurrentFrame()
  let resaltado = false
  const palabras = texto.split(/\s+/).map((p) => {
    const abre = p.startsWith('*')
    if (abre) resaltado = true
    const r = resaltado
    if (p.endsWith('*')) resaltado = false
    return { t: p.replace(/\*/g, ''), r }
  })
  return (
    <div style={{ fontFamily: f.display, fontWeight: 800, fontSize: tam, lineHeight: 1.04, letterSpacing: tam * -0.03, textAlign: alinear, display: 'flex', flexWrap: 'wrap', justifyContent: alinear === 'center' ? 'center' : 'flex-start', columnGap: tam * 0.24 }}>
      {palabras.map((p, i) => (
        <span key={i} style={{ ...entra(frame, desde + i * 3, 12), display: 'inline-block', color: p.r ? c.acento : c.tinta }}>
          {p.t}
        </span>
      ))}
    </div>
  )
}

// App de ejemplo: «Panadería La Espiga · Pedidos de hoy», que se arma sola.
const pedidos = [
  { nombre: 'Marta Gómez', detalle: '12 pandebonos · 1 roscón', hora: '7:30', total: '$ 38.500', color: '#F4A259', fondo: '#FFF1E2' },
  { nombre: 'Café Aroma', detalle: '40 croissants de mantequilla', hora: '8:00', total: '$ 152.000', color: '#D9644A', fondo: '#FDE8E2' },
  { nombre: 'Luis Pardo', detalle: '2 mogollas · 6 almojábanas', hora: '9:15', total: '$ 21.000', color: '#B8860B', fondo: '#FBF1D6' },
]

const T1 = 128 // toque en la tarjeta 2
const T2 = 196 // toque en el botón

const AppPanaderia: React.FC = () => {
  const frame = useCurrentFrame()
  const marcada = prog(frame, T1 + 3, 12)
  const boton = prog(frame, T2 + 2, 10)
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#FFFaf3', fontFamily: f.texto, color: '#2b1d12', padding: '10px 20px 0' }}>
      <div style={{ ...entra(frame, 26, 12), display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: '#E8833A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wheat size={26} color="#fff" strokeWidth={2.4} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a0785a', letterSpacing: 1.4 }}>PANADERÍA LA ESPIGA</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>Pedidos de hoy</div>
        </div>
      </div>
      <div style={{ ...entra(frame, 32, 12), display: 'flex', gap: 8, marginTop: 18 }}>
        {['Todos · 3', 'Por recoger', 'Listos'].map((t, i) => (
          <div key={t} style={{ padding: '7px 13px', borderRadius: 999, fontSize: 14, fontWeight: 600, background: i === 0 ? '#2b1d12' : '#F3E6D6', color: i === 0 ? '#fff' : '#7a5a40' }}>{t}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
        {pedidos.map((p, i) => {
          const lista = i === 1 ? marcada : 0
          return (
            <div
              key={p.nombre}
              style={{
                ...entra(frame, 38 + i * 6, 14, 40),
                background: interpolate(lista, [0, 1], [0, 1]) > 0.5 ? '#E7F5E9' : p.fondo,
                borderRadius: 20, padding: '16px 16px', display: 'flex', gap: 14, alignItems: 'center',
                boxShadow: `inset 0 0 0 ${1 + lista}px ${lista > 0.5 ? '#5BB16A' : 'rgba(43,29,18,0.06)'}`,
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: lista > 0.5 ? '#5BB16A' : p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {lista > 0.5 ? (
                  <Check size={28} color="#fff" strokeWidth={3} style={{ transform: `scale(${0.6 + lista * 0.4})` }} />
                ) : (
                  <Croissant size={28} color="#fff" strokeWidth={2.2} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>{p.nombre}</div>
                <div style={{ fontSize: 14, color: '#7a5a40', marginTop: 2 }}>{p.detalle}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#a0785a', marginTop: 6 }}>
                  <Clock size={13} color="#a0785a" /> {lista > 0.5 ? 'Listo para recoger' : `Recoge ${p.hora}`}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{p.total}</div>
            </div>
          )
        })}
      </div>
      <div style={{ ...entra(frame, 60, 14), marginTop: 18, background: '#fff', borderRadius: 20, padding: 16, boxShadow: 'inset 0 0 0 1px rgba(43,29,18,0.07)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#a0785a', letterSpacing: 1.2 }}>VENTAS DE HOY</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 10, height: 70 }}>
          {[34, 52, 40, 66, 58, 80, 46].map((h, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 6, background: i === 5 ? '#E8833A' : '#F3E0C8', height: h * prog(frame, 66 + i * 3, 16) * 0.85 }} />
          ))}
        </div>
      </div>
      <div
        style={{
          ...entra(frame, 70, 14),
          position: 'absolute', left: 20, right: 20, bottom: 40, height: 60, borderRadius: 18,
          background: interpolate(boton, [0, 0.5, 1], [0, 1, 1]) > 0.5 ? '#2b1d12' : '#E8833A',
          color: '#fff', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 10px 24px rgba(232,131,58,0.35)',
        }}
      >
        {boton > 0.5 ? <><Check size={20} color="#fff" strokeWidth={3} /> Pedido creado</> : '+ Nuevo pedido'}
      </div>
    </div>
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
      <div style={{ position: 'absolute', left: 70, right: 70, top: 250 }}>
        <TextoAnimado texto="Tu panadería, *en el bolsillo*" tam={74} alinear="center" desde={4} />
      </div>
      <Telefono
        desde={0}
        toques={[{ x: 200, y: 345, frame: T1 }, { x: 195, y: 774, frame: T2 }]}
        notificacion={{ titulo: 'Nuevo pedido', texto: '2 croissants · Ana Ruiz recoge a las 10:00', icono: 'shopping-bag', app: 'La Espiga', color: '#E8833A', frame: 150, dura: 70 }}
      >
        <AppPanaderia />
      </Telefono>
    </AbsoluteFill>
  )
}

const RootPrueba: React.FC = () => (
  <Composition id="PruebaTelefono" component={Prueba} durationInFrames={270} fps={30} width={1080} height={1920} />
)

registerRoot(RootPrueba)
