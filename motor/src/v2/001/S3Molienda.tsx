import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { N, Kicker, Tarjeta, p, pop, entra, sale, enEscena, deriva, mezcla, hex, contar, easeIn } from '../kit'
import type { TipoSonido } from '../sonido'
import { C, Titular, Sello } from './comun'

// S3 · Molienda y medida — t0 8,38 · t1 14,96 (198 f). Acto A: error 2 (moler antes). Acto B: error 3 (medir a ojo).
const T0 = 8.38
const T = (s: number) => enEscena(s, T0)
export const DUR_S3 = 198

const F = {
  dos: T(8.5),
  molerlo: T(8.78),
  dias: T(9.27),
  antes: T(9.55),
  muelelo: T(9.97),
  justo: T(10.46),
  tres: T(11.23),
  medir: T(11.58),
  ojo: T(12.16),
  gramo: T(12.67),
  cada: T(13.25),
  dieciseis: T(13.53),
  agua: T(14.38),
}

export const SFX_S3: { f: number; tipo: TipoSonido; vol?: number }[] = [
  { f: F.dos, tipo: 'pop' },
  { f: F.dias, tipo: 'swish' },
  { f: F.dias + 8, tipo: 'swish' },
  { f: F.dias + 16, tipo: 'swish' },
  { f: F.antes, tipo: 'error' },
  { f: F.muelelo - 4, tipo: 'whoosh' },
  { f: F.muelelo + 4, tipo: 'teclas', vol: 0.1 },
  { f: F.justo, tipo: 'sello' },
  { f: F.tres - 4, tipo: 'whoosh' },
  { f: F.ojo, tipo: 'error' },
  { f: F.gramo, tipo: 'click' },
  { f: F.dieciseis, tipo: 'impacto', vol: 0.1 },
  { f: F.agua, tipo: 'exito' },
]

const A_FIN = F.tres - 4 // el acto A sale

/** Bolsa de café abierta. `aroma` 0–1 controla las ondas de olor. */
const Bolsa: React.FC<{ f: number; aroma: number }> = ({ f, aroma }) => (
  <svg width={320} height={420} viewBox="0 0 320 420" style={{ overflow: 'visible' }}>
    {[0, 1, 2].map((k) => {
      const t = ((f + k * 14) % 42) / 42
      return (
        <path
          key={k}
          d={`M ${110 + k * 50} ${70 - t * 60} q 14 -18 0 -36 q -14 -18 0 -36`}
          fill="none"
          stroke={C.crema}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={aroma * (1 - t) * 0.9}
        />
      )
    })}
    <path d="M 40 90 L 280 90 L 300 400 Q 300 412 288 412 L 32 412 Q 20 412 20 400 Z" fill="#8A6A4E" />
    <path d="M 40 90 L 280 90 L 274 130 L 46 130 Z" fill="#6E523B" />
    <ellipse cx={160} cy={96} rx={116} ry={16} fill="#2E1C10" />
    <rect x={80} y={210} width={160} height={120} rx={16} fill="#F3E7D6" />
    <circle cx={160} cy={270} r={34} fill={C.cafe} />
    <path d="M 152 240 C 172 258, 148 282, 168 300" stroke="#5A3520" strokeWidth={6} fill="none" strokeLinecap="round" />
  </svg>
)

/** Molinillo de manivela propio. `giro` en grados. */
const Molinillo: React.FC<{ f: number; giro: number; cae: number }> = ({ f, giro, cae }) => {
  const granos = Array.from({ length: 10 }, (_, i) => {
    const t = ((f * 1.3 + i * 7) % 30) / 30
    return { x: 150 + ((i * 23) % 40) - 20, y: 250 + t * 60, o: cae * (1 - t) }
  })
  return (
    <svg width={320} height={440} viewBox="0 0 320 440" style={{ overflow: 'visible' }}>
      {/* tolva */}
      <path d="M 90 120 L 230 120 L 200 200 L 120 200 Z" fill="#B9B3AA" />
      <ellipse cx={160} cy={120} rx={70} ry={14} fill="#D6D0C7" />
      {/* manivela */}
      <g transform={`rotate(${giro} 160 100)`}>
        <rect x={156} y={96} width={110} height={10} rx={5} fill="#3A3A48" />
        <circle cx={266} cy={101} r={16} fill={C.cafe} />
      </g>
      <circle cx={160} cy={100} r={12} fill="#4A4A5A" />
      {/* cuerpo de madera */}
      <rect x={70} y={200} width={180} height={220} rx={18} fill="#8A5A3B" />
      <rect x={70} y={200} width={60} height={220} rx={18} fill="#9E6B49" />
      {/* cajón con molienda */}
      <rect x={100} y={320} width={120} height={70} rx={10} fill="#6B4430" />
      <rect x={110} y={330 + 40 * (1 - cae)} width={100} height={50 * cae} rx={8} fill="#4A2C18" />
      <circle cx={160} cy={300} r={8} fill={C.crema} />
      {granos.map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y} r={4} fill="#3A2416" opacity={g.o} />
      ))}
    </svg>
  )
}

/** Cuchara colmada de café molido. */
const Cuchara: React.FC = () => (
  <svg width={380} height={180} viewBox="0 0 380 180">
    <rect x={180} y={80} width={190} height={22} rx={11} fill="#B9B3AA" transform="rotate(-8 180 90)" />
    <ellipse cx={110} cy={100} rx={100} ry={56} fill="#D6D0C7" />
    <path d="M 20 96 Q 110 -10 200 96 Z" fill="#4A2C18" />
    {[40, 70, 100, 130, 160].map((x, i) => (
      <circle key={x} cx={x} cy={84 - (i % 2) * 10} r={7} fill="#5A3520" />
    ))}
  </svg>
)

const DIAS = ['Lun', 'Mar', 'Mié']

export const S3Molienda: React.FC<{ portada?: boolean }> = ({ portada }) => {
  const actual = useCurrentFrame()
  const f = portada ? DUR_S3 - 1 : actual
  const zoom = mezcla(1, 1.05, interpolate(f, [0, DUR_S3], [0, 1], { extrapolateRight: 'clamp' }))
  const d = deriva(f, 3, 4)

  // ─── acto A ───
  const actoA = f < A_FIN + 10
  const salA = p(f, A_FIN, 9, easeIn)
  const pierde = p(f, F.dias, F.antes + 6 - F.dias)
  const gana = p(f, F.muelelo + 4, 22)
  const aroma = mezcla(mezcla(1, 0.2, pierde), 1, gana)
  const colAroma = gana > 0.5 ? N.ok : aroma < 0.5 ? N.rojo : N.meta
  const bolsaSale = p(f, F.muelelo - 4, 10, easeIn)
  const giro = f > F.muelelo ? (f - F.muelelo) * 16 : 0
  const pagina = Math.min(DIAS.length - 1, Math.max(0, Math.floor((f - F.dias) / 8)))

  // ─── acto B ───
  const actoB = f >= F.tres - 2
  const bal = p(f, F.gramo, 14)
  const tambalea = f >= F.medir ? Math.sin((f - F.medir) / 3.2) * 9 * (1 - p(f, F.gramo, 12) * 0.8) : 0
  const ejemplo = Math.round(contar(f, F.agua, 14, 320))

  return (
    <AbsoluteFill style={{ transform: `translate(${d.x}px, ${d.y}px) scale(${zoom})`, transformOrigin: '510px 860px' }}>
      {/* titulares */}
      {actoA ? (
        <div style={{ position: 'absolute', left: 80, top: 252, ...sale(f, A_FIN, 7) }}>
          <div style={entra(f, 0, 10, 14)}>
            <Kicker texto="Error 2" color={C.cafe} />
          </div>
          <Titular
            f={f}
            size={118}
            style={{ marginTop: 22, marginLeft: -4 }}
            lineas={f < F.muelelo ? [[[F.dos, 'Molido']], [[F.dias, 'hace'], [F.dias + 4, 'días', N.rojo]]] : [[[F.muelelo + 2, 'Muélelo']], [[F.justo, 'al'], [F.justo + 3, 'momento', N.ok]]]}
          />
        </div>
      ) : null}
      {actoB ? (
        <div style={{ position: 'absolute', left: 80, top: 252 }}>
          <div style={entra(f, F.tres - 2, 10, 14)}>
            <Kicker texto="Error 3" color={N.meta} />
          </div>
          <Titular
            f={f}
            size={118}
            style={{ marginTop: 22, marginLeft: -4 }}
            lineas={f < F.gramo + 8 ? [[[F.medir, 'Medir']], [[F.medir + 6, 'a'], [F.ojo, 'ojo', N.rojo]]] : [[[F.gramo + 8, 'Mejor'], [F.cada, 'pesa']], [[F.dieciseis, '1 : 16', N.meta]]]}
          />
        </div>
      ) : null}

      {/* acto A: bolsa → molinillo */}
      {actoA ? (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: 1 - salA, transform: `translateX(${-80 * salA}px)` }}>
          {f < F.muelelo + 8 ? (
            <div style={{ position: 'absolute', left: 90, top: 700, ...entra(f, 2, 12, 30), opacity: p(f, 2, 12) * (1 - bolsaSale), transform: `translateX(${-260 * bolsaSale}px) rotate(${-8 * bolsaSale}deg) scale(1.25)`, transformOrigin: '0 0' }}>
              <Bolsa f={f} aroma={aroma} />
            </div>
          ) : null}
          {f >= F.muelelo - 4 ? (
            <div style={{ position: 'absolute', left: 90, top: 690, ...entra(f, F.muelelo - 2, 12, 40) }}>
              <div style={{ transform: 'scale(1.22)', transformOrigin: '0 0' }}>
              <Molinillo f={f} giro={giro} cae={p(f, F.muelelo + 6, 30)} />
              </div>
            </div>
          ) : null}

          {/* aroma */}
          <div style={{ position: 'absolute', left: 540, top: 730, ...entra(f, 6, 12, 24) }}>
            <Tarjeta glow={colAroma} fuerza={0.5} style={{ width: 400, padding: '24px 30px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: N.fMono, fontWeight: 700, fontSize: 34, letterSpacing: 5, color: N.texto2, textTransform: 'uppercase' }}>Aroma</span>
                <span style={{ fontFamily: N.fMono, fontWeight: 800, fontSize: 52, color: colAroma }}>{Math.round(aroma * 100)} %</span>
              </div>
              <div style={{ marginTop: 18, height: 30, borderRadius: 15, background: N.tarjeta2, overflow: 'hidden' }}>
                <div style={{ height: 30, width: `${aroma * 100}%`, borderRadius: 15, background: colAroma, boxShadow: `0 0 24px ${colAroma}${hex(0.6)}` }} />
              </div>
            </Tarjeta>
          </div>

          {/* calendario → sello */}
          {f < F.muelelo ? (
            <div style={{ position: 'absolute', left: 610, top: 950, ...entra(f, F.dias - 6, 10, 20), ...(f >= F.muelelo - 6 ? sale(f, F.muelelo - 6, 6) : {}) }}>
              <div style={{ position: 'relative', width: 260, height: 240 }}>
                {DIAS.map((dia, i) => {
                  const ida = p(f, F.dias + i * 8 + 6, 8, easeIn)
                  if (i < pagina - 1) return null
                  return (
                    <div
                      key={dia}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10 - i,
                        borderRadius: 24,
                        background: '#F3EEE6',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        transformOrigin: '50% 0',
                        transform: i < DIAS.length - 1 ? `rotateX(${ida * 100}deg)` : undefined,
                        opacity: i < DIAS.length - 1 ? 1 - ida : 1,
                      }}
                    >
                      <div style={{ height: 64, background: N.rojo, color: '#fff', fontFamily: N.fMono, fontWeight: 800, fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 4 }}>MOLIDO</div>
                      <div style={{ fontFamily: N.fTexto, fontWeight: 900, fontSize: 96, color: '#191733', textAlign: 'center', marginTop: 20 }}>{dia}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', left: 570, top: 1000 }}>
              <Sello f={f} en={F.justo} texto="Recién molido" color={N.ok} size={44} giro={-5} />
            </div>
          )}
        </div>
      ) : null}

      {/* acto B: cuchara → balanza */}
      {actoB ? (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920 }}>
          <div style={{ position: 'absolute', left: 90, top: 680, opacity: p(f, F.tres, 12) * (1 - 0.5 * bal), transform: `translateY(${(1 - p(f, F.tres, 12)) * 40}px) rotate(${tambalea}deg) scale(${1.5 * (1 - 0.35 * bal)})`, transformOrigin: '0 0' }}>
            <Cuchara />
          </div>
          {f >= F.ojo ? (
            <div style={{ position: 'absolute', left: 660, top: 660, fontFamily: N.fTexto, fontWeight: 900, fontSize: 150, color: N.rojo, transform: `scale(${pop(f, F.ojo, 12)}) rotate(8deg)`, opacity: p(f, F.ojo, 6) * (1 - p(f, F.gramo, 8)) }}>
              ¿?
            </div>
          ) : null}

          {/* balanza digital */}
          {f >= F.gramo - 2 ? (
            <div style={{ position: 'absolute', left: 110, top: 920, opacity: bal, transform: `translateY(${(1 - bal) * 60}px)`, filter: `blur(${(1 - bal) * 10}px)` }}>
              <div style={{ width: 840, height: 70, borderRadius: '24px 24px 8px 8px', background: '#B9B3AA', margin: '0 auto' }} />
              <div style={{ width: 860, height: 230, marginTop: 10, borderRadius: 32, background: '#22222C', border: `2px solid ${N.linea}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 30px', boxSizing: 'border-box' }}>
                {[
                  { n: 1, u: 'g café', col: C.cafe, en: F.gramo + 4 },
                  { n: 16, u: 'g agua', col: C.agua, en: F.dieciseis },
                ].map((c) => (
                  <div key={c.u} style={{ width: 360, height: 160, borderRadius: 20, background: '#0E1712', border: `2px solid ${c.col}${hex(0.5)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...entra(f, c.en, 10, 10) }}>
                    <div style={{ fontFamily: N.fMono, fontWeight: 800, fontSize: 84, color: c.col, lineHeight: 1, textShadow: `0 0 24px ${c.col}${hex(0.6)}` }}>{Math.round(contar(f, c.en, 10, c.n))}</div>
                    <div style={{ fontFamily: N.fMono, fontWeight: 700, fontSize: 34, color: N.texto2, marginTop: 6 }}>{c.u}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ejemplo */}
          {f >= F.agua - 2 ? (
            <div style={{ position: 'absolute', left: 430, width: 520, top: 790, display: 'flex', justifyContent: 'flex-end', ...entra(f, F.agua, 10, 14) }}>
              <div style={{ fontFamily: N.fMono, fontWeight: 800, fontSize: 44, color: N.texto, background: N.tarjeta2, borderRadius: 999, padding: '8px 28px', whiteSpace: 'nowrap', border: `2px solid ${N.meta}${hex(0.5)}` }}>
                Ej.: 20 g <span style={{ color: N.meta }}>→</span> <span style={{ color: C.agua }}>{ejemplo} g</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}

