import React from 'react'
import { useCurrentFrame } from 'remotion'

import { f, prog } from '../tema'

// ─── Mini juegos que se juegan solos ─────────────────────────────────────────
// Tres juegos de pixel art (saltador, serpiente, ladrillos) simulados frame a
// frame de forma determinista: el mismo frame siempre pinta lo mismo. Todo se
// dibuja en una retícula lógica de 64 columnas (1 unidad = 1 «pixel» del juego)
// y el SVG la escala a `ancho`×`alto`. Con `generar`, el juego primero aparece
// por capas (fondo → escenario → personaje → HUD) como si la IA lo creara.

export type TipoJuego = 'saltador' | 'serpiente' | 'ladrillos'

export interface PaletaJuego {
  fondo: string
  fondo2: string
  hud: string // texto del HUD
  colores: string[] // [personaje, escenario, extra1, extra2, …]
}

export interface JuegoProps {
  tipo: TipoJuego
  desde?: number // frame en que arranca (o empieza a generarse)
  ancho?: number
  alto?: number
  paleta?: Partial<PaletaJuego>
  generar?: boolean // aparece por capas antes de jugar
  durGenerar?: number // frames que tarda en generarse (≈1 s)
  nivel?: number
  estilo?: React.CSSProperties
}

const LW0 = 64 // ancho lógico en pixeles de juego (el saltador usa menos: pixeles más grandes)
const anchoLogico = (tipo: TipoJuego) => (tipo === 'saltador' ? 44 : LW0)
const LW = LW0

const PALETAS: Record<TipoJuego, PaletaJuego> = {
  saltador: { fondo: '#7cc8ff', fondo2: '#bfe6ff', hud: '#14213d', colores: ['#ff4d6d', '#2b9348', '#ffd23f', '#8d5a2b', '#ffffff', '#55a630'] },
  serpiente: { fondo: '#16213e', fondo2: '#1d2b52', hud: '#f1f5ff', colores: ['#4ade80', '#22c55e', '#ff4d6d', '#ffd23f', '#a78bfa', '#38bdf8'] },
  ladrillos: { fondo: '#120e2b', fondo2: '#1d1842', hud: '#f5f3ff', colores: ['#f8fafc', '#94a3b8', '#ff4d6d', '#ff9f1c', '#ffd23f', '#4ade80', '#38bdf8', '#a78bfa'] },
}

// Pseudoaleatorio estable: el mismo par siempre da el mismo número en [0, 1).
const h = (a: number, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// ─── Efectos comunes ─────────────────────────────────────────────────────────

interface Evento {
  t: number // frame de juego en que ocurre
  x: number
  y: number
  color: string
  n?: number // partículas
  puntos?: number // texto flotante «+N»
  golpe?: number // fuerza de sacudida
}

const VIDA = 18

const Particulas: React.FC<{ eventos: Evento[]; t: number }> = ({ eventos, t }) => (
  <g>
    {eventos.map((ev, i) => {
      const edad = t - ev.t
      if (edad < 0 || edad > VIDA) return null
      const n = ev.n ?? 10
      const a = 1 - edad / VIDA
      return (
        <g key={i}>
          {Array.from({ length: n }, (_, k) => {
            const ang = h(ev.t + i, k) * Math.PI * 2
            const vel = 0.35 + h(k, ev.t + 3) * 0.9
            const x = ev.x + Math.cos(ang) * vel * edad
            const y = ev.y + Math.sin(ang) * vel * edad + 0.03 * edad * edad
            const s = k % 3 === 0 ? 1.4 : 1
            return <rect key={k} x={Math.round(x)} y={Math.round(y)} width={s} height={s} fill={ev.color} opacity={a} />
          })}
          {ev.puntos ? (
            <text
              x={ev.x}
              y={Math.max(11, ev.y - 3 - edad * 0.45)} // nunca encima del HUD
              fill="#fff"
              stroke="#000"
              strokeWidth={0.5}
              paintOrder="stroke"
              fontFamily={f.mono}
              fontWeight={700}
              fontSize={3.2}
              textAnchor="middle"
              opacity={edad < 12 ? 1 : 1 - (edad - 12) / 6}
            >
              +{ev.puntos}
            </text>
          ) : null}
        </g>
      )
    })}
  </g>
)

const sacudida = (eventos: Evento[], t: number) => {
  let dx = 0
  let dy = 0
  for (const ev of eventos) {
    const edad = t - ev.t
    if (!ev.golpe || edad < 0 || edad > 8) continue
    const a = ev.golpe * (1 - edad / 8)
    dx += Math.sin(edad * 2.7 + ev.t) * a
    dy += Math.cos(edad * 3.1 + ev.t) * a
  }
  return { dx, dy }
}

// ─── Saltador (tipo dinosaurio de Chrome) ────────────────────────────────────

interface Escena {
  fondo: React.ReactNode // cielo, nubes, decorado lejano
  escenario: React.ReactNode // suelo, obstáculos, grilla, ladrillos
  personaje: React.ReactNode
  efectos: React.ReactNode
  puntos: number
  eventos: Evento[]
}

const saltador = (t: number, LH: number, p: PaletaJuego): Escena => {
  const LW = anchoLogico('saltador')
  const [cPj, cObs, cMon, cTierra, cNube, cPasto] = p.colores
  const v = 0.8 // unidades por frame
  const J = 24 // frames en el aire
  const ALT = 13
  const piso = Math.round(LH * 0.74)
  const px = 8
  const scroll = t * v

  // Obstáculos en posiciones fijas del mundo.
  const obs: { x: number; w: number; hgt: number }[] = []
  let x = 40
  for (let i = 0; i < 40; i++) {
    const w = 3 + Math.floor(h(i, 1) * 3)
    const hgt = 5 + Math.floor(h(i, 2) * 5)
    obs.push({ x, w, hgt })
    x += 27 + Math.floor(h(i, 3) * 13)
  }
  // El salto se centra en el obstáculo: el ápice cae justo encima.
  const saltos = obs.map((o) => (o.x + o.w / 2 - (px + 3)) / v - J / 2)
  let y = 0
  let enAire = false
  let aterrizo = -99
  for (const s of saltos) {
    const k = t - s
    if (k >= 0 && k <= J) {
      const u = k / J
      y = 4 * ALT * u * (1 - u)
      enAire = true
    }
    if (k > J) aterrizo = Math.max(aterrizo, s + J)
  }

  const eventos: Evento[] = []
  let monedas = 0
  saltos.forEach((s, i) => {
    const tc = s + J / 2
    if (i % 2 === 0) {
      if (t >= tc) {
        monedas++
        eventos.push({ t: Math.round(tc), x: px + 3, y: piso - ALT - 6, color: cMon, n: 12, puntos: 50, golpe: 0.8 })
      }
    }
    if (t >= s + J) eventos.push({ t: Math.round(s + J), x: px + 3, y: piso - 1, color: '#e9d8a6', n: 6 })
  })
  const puntos = Math.floor(t * 1.5) + monedas * 50

  const nubes = [0, 1, 2, 3].map((i) => {
    const w = 10 + i * 2
    const span = LW + 30
    const nx = ((((10 + i * 23 - t * 0.22) % span) + span) % span) - 15
    const ny = 14 + Math.floor(h(i, 9) * 14)
    return (
      <g key={i} fill={cNube}>
        <rect x={Math.round(nx)} y={ny} width={w} height={3} />
        <rect x={Math.round(nx) + 2} y={ny - 2} width={w - 5} height={2} />
      </g>
    )
  })
  const colinas = [0, 1, 2, 3, 4].map((i) => {
    const span = 90
    const cx = ((((i * 26 - t * 0.45) % span) + span) % span) - 15
    const hh = 8 + Math.floor(h(i, 5) * 6)
    return (
      <g key={i} fill={p.fondo2}>
        <rect x={Math.round(cx)} y={piso - hh} width={18} height={hh} />
        <rect x={Math.round(cx) + 3} y={piso - hh - 2} width={12} height={2} />
        <rect x={Math.round(cx) + 6} y={piso - hh - 4} width={6} height={2} />
      </g>
    )
  })
  const fondo = (
    <g>
      <rect x={0} y={0} width={LW} height={LH} fill={p.fondo} />
      {/* Sol */}
      <g fill={cMon}>
        <rect x={LW - 13} y={13} width={8} height={8} />
        <rect x={LW - 14} y={15} width={10} height={4} />
        <rect x={LW - 11} y={12} width={4} height={10} />
      </g>
      {nubes}
      {colinas}
    </g>
  )

  const marcas = Array.from({ length: 12 }, (_, i) => {
    const span = LW + 8
    const mx = ((((i * 7 - scroll) % span) + span) % span) - 4
    return <rect key={i} x={Math.round(mx)} y={piso + 3 + (i % 3) * 3} width={2 + (i % 2)} height={1} fill={p.fondo2} opacity={0.35} />
  })
  const escenario = (
    <g>
      <rect x={0} y={piso} width={LW} height={2} fill={cPasto} />
      <rect x={0} y={piso + 2} width={LW} height={LH - piso} fill={cTierra} />
      {marcas}
      {obs.map((o, i) => {
        const ox = Math.round(o.x - scroll)
        if (ox < -8 || ox > LW + 2) return null
        const top = piso - o.hgt
        return (
          <g key={i} fill={cObs}>
            <rect x={ox} y={top} width={o.w} height={o.hgt} />
            <rect x={ox - 2} y={top + 3} width={2} height={1} />
            <rect x={ox - 2} y={top + 1} width={1} height={2} />
            <rect x={ox + o.w} y={top + 2} width={2} height={1} />
            <rect x={ox + o.w + 1} y={top} width={1} height={2} />
            <rect x={ox + 1} y={top + 1} width={1} height={1} fill="#000" opacity={0.18} />
          </g>
        )
      })}
      {/* Monedas que aún no se ha comido */}
      {saltos.map((s, i) => {
        if (i % 2 !== 0 || t >= s + J / 2) return null
        const o = obs[i]
        const mx = Math.round(o.x + o.w / 2 - scroll - 1.5)
        if (mx < -4 || mx > LW + 2) return null
        const giro = Math.abs(Math.sin(t * 0.18 + i))
        const w = Math.max(1, Math.round(3 * giro))
        return <rect key={i} x={mx + (3 - w) / 2} y={piso - ALT - 7} width={w} height={3} fill={cMon} />
      })}
    </g>
  )

  // Personaje: cuadrado con ojo, se estira al subir y se aplasta al caer.
  const sinceLand = t - aterrizo
  const aplasta = !enAire && sinceLand >= 0 && sinceLand < 4 ? 1 : 0
  const pw = 6 + aplasta
  const ph = 6 - aplasta + (enAire && y < ALT * 0.6 ? 1 : 0)
  const py = Math.round(piso - ph - y)
  const pasos = Math.floor(t / 4) % 2
  const personaje = (
    <g>
      <rect x={px - aplasta / 2} y={py} width={pw} height={ph} fill={cPj} />
      <rect x={px + 3} y={py + 1} width={2} height={2} fill="#fff" />
      <rect x={px + 4} y={py + 1} width={1} height={1} fill="#000" />
      <rect x={px} y={py + ph - 1} width={pw} height={1} fill="#000" opacity={0.15} />
      {/* Sombra */}
      <rect x={px + 1 + Math.round(y / 8)} y={piso + 0.4} width={Math.max(2, 5 - Math.round(y / 5))} height={0.8} fill="#000" opacity={0.2} />
      {/* Estela de velocidad */}
      {[0, 1, 2].map((k) => (
        <rect key={k} x={px - 4 - k * 3 - ((t + k * 2) % 3)} y={py + 1 + k * 2} width={2} height={0.6} fill="#fff" opacity={0.5 - k * 0.12} />
      ))}
    </g>
  )

  return { fondo, escenario, personaje, efectos: <Particulas eventos={eventos} t={t} />, puntos, eventos }
}

// ─── Serpiente (snake) ───────────────────────────────────────────────────────

const PASO = 2 // frames por casilla

const serpiente = (t: number, LH: number, p: PaletaJuego): Escena => {
  const [cCab, cCuerpo, cComida, cBrillo] = p.colores
  const COLS = 16
  const cel = LW / COLS
  const top = 10
  const ROWS = Math.floor((LH - top - 2) / cel)
  const oy = top + (LH - top - 2 - ROWS * cel) / 2

  // Comida en una secuencia fija; la primera queda cerca para que coma pronto.
  let iComida = 0
  const siguienteComida = (cuerpo: [number, number][]): [number, number] => {
    for (;;) {
      const k = iComida++
      const c: [number, number] =
        k === 0 ? [11, Math.floor(ROWS / 2) - 2] : [1 + Math.floor(h(k, 41) * (COLS - 2)), 1 + Math.floor(h(k, 42) * (ROWS - 2))]
      if (!cuerpo.some(([a, b]) => a === c[0] && b === c[1])) return c
    }
  }

  const fila0 = Math.floor(ROWS / 2)
  let cuerpo: [number, number][] = [
    [5, fila0],
    [4, fila0],
    [3, fila0],
    [2, fila0],
  ]
  let dir: [number, number] = [1, 0]
  let comida = siguienteComida(cuerpo)
  let creciendo = 0
  let comidas = 0
  let tComida = 0
  const eventos: Evento[] = []
  const pasos = Math.floor(Math.max(0, t) / PASO)

  for (let s = 0; s < pasos; s++) {
    const [hx, hy] = cuerpo[0]
    const opciones: [number, number][] = [dir, [dir[1], -dir[0]], [-dir[1], dir[0]]]
    let mejor: [number, number] | null = null
    let mejorD = Infinity
    for (const d of opciones) {
      const nx = hx + d[0]
      const ny = hy + d[1]
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue
      if (cuerpo.slice(0, -1).some(([a, b]) => a === nx && b === ny)) continue
      // Libertad: casillas vecinas libres (evita meterse en callejones).
      let libres = 0
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const qx = nx + ax
        const qy = ny + ay
        if (qx >= 0 && qy >= 0 && qx < COLS && qy < ROWS && !cuerpo.some(([a, b]) => a === qx && b === qy)) libres++
      }
      const dist = Math.abs(nx - comida[0]) + Math.abs(ny - comida[1]) + (libres === 0 ? 100 : 0)
      if (dist < mejorD) {
        mejorD = dist
        mejor = d
      }
    }
    if (!mejor) {
      // Atrapada (no debería pasar en pocos segundos): reinicia.
      cuerpo = [
        [5, fila0],
        [4, fila0],
        [3, fila0],
      ]
      dir = [1, 0]
      continue
    }
    dir = mejor
    const cab: [number, number] = [hx + dir[0], hy + dir[1]]
    cuerpo = [cab, ...cuerpo]
    if (creciendo > 0) creciendo--
    else cuerpo.pop()
    if (cab[0] === comida[0] && cab[1] === comida[1]) {
      comidas++
      creciendo += 2
      const te = (s + 1) * PASO
      eventos.push({ t: te, x: oy * 0 + cab[0] * cel + cel / 2, y: oy + cab[1] * cel + cel / 2, color: cComida, n: 14, puntos: 10, golpe: 0.9 })
      comida = siguienteComida(cuerpo)
      tComida = te
    }
  }

  const grilla = (
    <g>
      <rect x={0} y={oy} width={LW} height={ROWS * cel} fill={p.fondo2} />
      {Array.from({ length: COLS * ROWS }, (_, i) => {
        const cx = i % COLS
        const cy = Math.floor(i / COLS)
        if ((cx + cy) % 2) return null
        return <rect key={i} x={cx * cel} y={oy + cy * cel} width={cel} height={cel} fill={p.fondo} opacity={0.55} />
      })}
    </g>
  )

  const edadC = t - tComida
  const pop = cl(edadC / 6, 0, 1)
  const late = 1 + Math.sin(t * 0.35) * 0.08
  const tc = cel * 0.8 * pop * late
  const comidaEl = (
    <g>
      <rect x={comida[0] * cel + (cel - tc) / 2} y={oy + comida[1] * cel + (cel - tc) / 2} width={tc} height={tc} fill={cComida} />
      <rect x={comida[0] * cel + (cel - tc) / 2 + 0.5} y={oy + comida[1] * cel + (cel - tc) / 2 + 0.5} width={tc * 0.3} height={tc * 0.3} fill="#fff" opacity={0.7 * pop} />
    </g>
  )

  const personaje = (
    <g>
      {cuerpo
        .slice()
        .reverse()
        .map(([a, b], iRev) => {
          const i = cuerpo.length - 1 - iRev
          const m = i === 0 ? 0.2 : 0.45
          const col = i === 0 ? cCab : i % 2 ? cCuerpo : cCab
          return <rect key={i} x={a * cel + m} y={oy + b * cel + m} width={cel - m * 2} height={cel - m * 2} fill={col} />
        })}
      {(() => {
        const [a, b] = cuerpo[0]
        const cx = a * cel + cel / 2
        const cy = oy + b * cel + cel / 2
        const ox = dir[0] * 0.8
        const oyy = dir[1] * 0.8
        const px = -dir[1] * 0.9
        const py = dir[0] * 0.9
        return (
          <g fill="#0b1020">
            <rect x={cx + ox + px - 0.4} y={cy + oyy + py - 0.4} width={0.8} height={0.8} />
            <rect x={cx + ox - px - 0.4} y={cy + oyy - py - 0.4} width={0.8} height={0.8} />
          </g>
        )
      })()}
    </g>
  )

  return {
    fondo: <rect x={0} y={0} width={LW} height={LH} fill={p.fondo} />,
    escenario: (
      <g>
        {grilla}
        {comidaEl}
        <rect x={0} y={oy - 0.5} width={LW} height={0.5} fill={cBrillo} opacity={0.5} />
        <rect x={0} y={oy + ROWS * cel} width={LW} height={0.5} fill={cBrillo} opacity={0.5} />
      </g>
    ),
    personaje,
    efectos: <Particulas eventos={eventos} t={t} />,
    puntos: comidas * 10,
    eventos,
  }
}

// ─── Ladrillos (breakout) ────────────────────────────────────────────────────

const ladrillos = (t: number, LH: number, p: PaletaJuego): Escena => {
  const [cBola, cPaleta, ...cFilas] = p.colores
  const COLS = 8
  const FILAS = 6
  const mx = 2
  const bw = (LW - mx * 2) / COLS
  const bh = 3
  const top = 13
  const pyPal = LH - 8
  const pwPal = 12
  const B = 2 // lado de la bola
  const VEL = 1.6

  // Arranca con un túnel abierto en la columna 4: la bola entra por él y rompe
  // varios ladrillos seguidos (~10 en 3 s). Parámetros elegidos simulando.
  const TUNEL = 4
  const vivo = Array.from({ length: COLS * FILAS }, (_, i) => i % COLS !== TUNEL)
  let bx = 36
  let by = top + FILAS * bh + 6
  let vx = 0.24
  let vy = -1
  const norm = () => {
    const m = Math.hypot(vx, vy)
    vx = (vx / m) * VEL
    vy = (vy / m) * VEL
  }
  norm()
  let pal = LW / 2 - pwPal / 2
  let golpes = 0
  let rebotes = 0
  let tPaleta = -99
  const eventos: Evento[] = []
  const estela: [number, number][] = []
  const SUB = 3

  // Dónde cruzará la bola la línea de la paleta (rebotando en las paredes).
  const predice = () => {
    if (vy <= 0) return bx
    const pasos = (pyPal - B - by) / vy
    let x = bx + vx * pasos
    const ancho = LW - B
    x = ((x % (2 * ancho)) + 2 * ancho) % (2 * ancho)
    return x > ancho ? 2 * ancho - x : x
  }

  const T = Math.max(0, Math.floor(t))
  for (let fr = 0; fr < T; fr++) {
    for (let s = 0; s < SUB; s++) {
      const px = bx
      const py = by
      bx += vx / SUB
      by += vy / SUB
      if (bx < 0) {
        bx = -bx
        vx = Math.abs(vx)
      }
      if (bx > LW - B) {
        bx = 2 * (LW - B) - bx
        vx = -Math.abs(vx)
      }
      if (by < 8.5) {
        by = 8.5 + (8.5 - by)
        vy = Math.abs(vy)
      }
      // Paleta: siempre llega (el juego se juega solo y bien).
      if (vy > 0 && by + B >= pyPal) {
        by = pyPal - B
        const rel = cl((bx + B / 2 - (pal + pwPal / 2)) / (pwPal / 2), -1, 1)
        vx = rel * 1.1
        vy = -1
        norm()
        rebotes++
        tPaleta = fr
      }
      // Ladrillos
      for (let i = 0; i < vivo.length; i++) {
        if (!vivo[i]) continue
        const cx = mx + (i % COLS) * bw
        const cy = top + Math.floor(i / COLS) * bh
        if (bx + B > cx && bx < cx + bw && by + B > cy && by < cy + bh) {
          vivo[i] = false
          golpes++
          const dentroX = px + B > cx && px < cx + bw
          if (dentroX) vy = -vy
          else vx = -vx
          const fila = Math.floor(i / COLS)
          eventos.push({ t: fr, x: cx + bw / 2, y: cy + bh / 2, color: cFilas[fila % cFilas.length], n: 12, puntos: (FILAS - fila) * 10, golpe: 1 })
          break
        }
      }
    }
    // La paleta persigue el punto de caída con un desvío que varía el ángulo.
    const desvio = (h(rebotes, 77) - 0.5) * pwPal * 0.8
    const meta = cl(predice() + B / 2 - pwPal / 2 + desvio, 0, LW - pwPal)
    pal += cl((meta - pal) * 0.22, -1.6, 1.6)
    estela.unshift([bx, by])
    if (estela.length > 5) estela.pop()
    if (vivo.every((v) => !v)) vivo.fill(true) // nivel limpio: vuelve a llenarse
  }

  let puntos = 0
  for (const ev of eventos) puntos += ev.puntos ?? 0

  const escenario = (
    <g>
      {vivo.map((v, i) => {
        if (!v) return null
        const cx = mx + (i % COLS) * bw
        const cy = top + Math.floor(i / COLS) * bh
        const col = cFilas[Math.floor(i / COLS) % cFilas.length]
        return (
          <g key={i}>
            <rect x={cx + 0.25} y={cy + 0.25} width={bw - 0.5} height={bh - 0.5} fill={col} />
            <rect x={cx + 0.25} y={cy + 0.25} width={bw - 0.5} height={0.6} fill="#fff" opacity={0.35} />
            <rect x={cx + 0.25} y={cy + bh - 0.85} width={bw - 0.5} height={0.6} fill="#000" opacity={0.25} />
          </g>
        )
      })}
    </g>
  )

  const brillo = t - tPaleta < 5 ? 1 - (t - tPaleta) / 5 : 0
  const personaje = (
    <g>
      {estela.slice(1).map(([x, y], k) => (
        <rect key={k} x={x + 0.3} y={y + 0.3} width={B - 0.6} height={B - 0.6} fill={cBola} opacity={0.35 - k * 0.07} />
      ))}
      <rect x={bx} y={by} width={B} height={B} fill={cBola} />
      <rect x={pal} y={pyPal} width={pwPal} height={2} fill={cPaleta} />
      <rect x={pal} y={pyPal} width={pwPal} height={0.6} fill="#fff" opacity={0.5 + brillo * 0.5} />
      <rect x={pal - 1} y={pyPal + 0.5} width={1} height={1} fill={cFilas[0]} />
      <rect x={pal + pwPal} y={pyPal + 0.5} width={1} height={1} fill={cFilas[0]} />
    </g>
  )

  const estrellas = Array.from({ length: 26 }, (_, i) => (
    <rect key={i} x={Math.floor(h(i, 3) * LW)} y={9 + Math.floor(h(i, 4) * (LH - 10))} width={0.6} height={0.6} fill="#fff" opacity={0.15 + 0.25 * Math.abs(Math.sin(t * 0.08 + i))} />
  ))
  return {
    fondo: (
      <g>
        <rect x={0} y={0} width={LW} height={LH} fill={p.fondo} />
        <rect x={0} y={LH * 0.55} width={LW} height={LH * 0.45} fill={p.fondo2} opacity={0.6} />
        {estrellas}
      </g>
    ),
    escenario,
    personaje,
    efectos: <Particulas eventos={eventos} t={t} />,
    puntos,
    eventos,
  }
}

// ─── Componente ──────────────────────────────────────────────────────────────

const ETAPAS = ['fondo', 'escenario', 'personaje', 'HUD'] as const

export const Juego: React.FC<JuegoProps> = ({
  tipo,
  desde = 0,
  ancho = 640,
  alto = 960,
  paleta,
  generar = false,
  durGenerar = 30,
  nivel = 1,
  estilo,
}) => {
  const frame = useCurrentFrame()
  const LW = anchoLogico(tipo)
  const LH = Math.round((LW * alto) / ancho)
  const p: PaletaJuego = { ...PALETAS[tipo], ...paleta, colores: paleta?.colores ?? PALETAS[tipo].colores }
  const G = generar ? durGenerar : 0
  const g = frame - desde // frames desde que empieza (incluida la generación)
  const t = Math.max(0, g - G) // frames de juego
  if (g < 0 && !generar) return <div style={{ width: ancho, height: alto, ...estilo }} />

  const esc = tipo === 'saltador' ? saltador(t, LH, p) : tipo === 'serpiente' ? serpiente(t, LH, p) : ladrillos(t, LH, p)
  const { dx, dy } = sacudida(esc.eventos, t)

  // Generación por capas: cada una ocupa un cuarto de G.
  const q = G / 4
  const capa = (i: number) => (generar ? cl((g - i * q) / q, 0, 1) : 1)
  const pFondo = capa(0)
  const pEsc = capa(1)
  const pPj = capa(2)
  const pHud = capa(3)
  const generando = generar && g < G
  const etapa = ETAPAS[cl(Math.floor(g / Math.max(1, q)), 0, 3)]

  // Fondo: se arma en bloques de 8×8 que aparecen en desorden.
  const bloques = 8
  const mascaraFondo = generando ? (
    <mask id={`mf-${tipo}-${desde}`}>
      {Array.from({ length: Math.ceil(LW / bloques) * Math.ceil(LH / bloques) }, (_, i) => {
        const cols = Math.ceil(LW / bloques)
        const umbral = h(i, 13) * 0.75
        const on = pFondo > umbral ? 1 : 0
        return <rect key={i} x={(i % cols) * bloques} y={Math.floor(i / cols) * bloques} width={bloques} height={bloques} fill="#fff" opacity={on} />
      })}
    </mask>
  ) : null
  // Escenario: barrido de arriba abajo con una línea de escaneo.
  const yEscan = pEsc * LH
  // Personaje: aparece con un salto de escala y parpadeo.
  const sPj = pPj === 0 ? 0 : pPj < 1 ? 1.25 - 0.25 * prog(g, 2 * q, q) : 1
  const parpadeo = pPj > 0 && pPj < 1 ? (Math.floor(g / 2) % 2 ? 0.45 : 1) : pPj

  const puntosTxt = String(Math.floor(esc.puntos)).padStart(6, '0')
  const ultimo = esc.eventos.reduce((m, ev) => (ev.t <= t && ev.puntos ? Math.max(m, ev.t) : m), -99)
  const bump = t - ultimo < 6 ? 1 + 0.18 * (1 - (t - ultimo) / 6) : 1
  const nombre = tipo === 'saltador' ? 'SALTADOR' : tipo === 'serpiente' ? 'SERPIENTE' : 'LADRILLOS'
  const hudOscuro = tipo !== 'saltador'
  const [ax, ay] = tipo === 'saltador' ? [11, Math.round(LH * 0.74) - 3] : tipo === 'ladrillos' ? [LW / 2, LH - 7] : [LW / 2, LH / 2]

  return (
    <div style={{ width: ancho, height: alto, position: 'relative', overflow: 'hidden', background: generando ? '#0b0b0b' : p.fondo, ...estilo }}>
      <svg width={ancho} height={alto} viewBox={`0 0 ${LW} ${LH}`} shapeRendering="crispEdges" style={{ display: 'block' }}>
        <defs>{mascaraFondo}</defs>
        <g transform={`translate(${dx} ${dy})`}>
          <g mask={generando ? `url(#mf-${tipo}-${desde})` : undefined}>{esc.fondo}</g>
          <g opacity={pEsc > 0 ? 1 : 0}>
            <clipPath id={`ce-${tipo}-${desde}`}>
              <rect x={-4} y={-4} width={LW + 8} height={generando ? yEscan + 4 : LH + 8} />
            </clipPath>
            <g clipPath={`url(#ce-${tipo}-${desde})`}>{esc.escenario}</g>
          </g>
          <g opacity={parpadeo} transform={`translate(${ax} ${ay}) scale(${sPj}) translate(${-ax} ${-ay})`}>
            {esc.personaje}
          </g>
          {!generando ? esc.efectos : null}
        </g>

        {/* Retícula de construcción mientras se genera */}
        {generando ? (
          <g opacity={0.5 * (1 - pHud)}>
            {Array.from({ length: Math.floor(LW / 4) + 1 }, (_, i) => (
              <rect key={`v${i}`} x={i * 4} y={0} width={0.15} height={LH} fill="#fff" opacity={0.25} />
            ))}
            {Array.from({ length: Math.floor(LH / 4) + 1 }, (_, i) => (
              <rect key={`h${i}`} x={0} y={i * 4} width={LW} height={0.15} fill="#fff" opacity={0.25} />
            ))}
          </g>
        ) : null}
        {generando && pEsc > 0 && pEsc < 1 ? (
          <g>
            <rect x={0} y={yEscan - 0.6} width={LW} height={0.6} fill="#fff" />
            <rect x={0} y={yEscan - 4} width={LW} height={3.4} fill="#fff" opacity={0.12} />
          </g>
        ) : null}

        {/* HUD */}
        <g opacity={pHud} transform={`scale(${LW / LW0}) translate(0 ${(1 - prog(g, 3 * q, q || 1)) * -9 * (generar ? 1 : 0)})`}>
          <rect x={0} y={0} width={LW0} height={8} fill={hudOscuro ? '#000' : '#fff'} opacity={hudOscuro ? 0.35 : 0.45} />
          <text x={2.5} y={3.6} fontFamily={f.mono} fontWeight={700} fontSize={2} fill={p.hud} opacity={0.7} letterSpacing={0.2}>
            PUNTOS
          </text>
          <text
            x={2.5}
            y={6.9}
            fontFamily={f.mono}
            fontWeight={700}
            fontSize={3.3}
            fill={p.hud}
            transform={`translate(2.5 6.9) scale(${bump}) translate(-2.5 -6.9)`}
          >
            {puntosTxt}
          </text>
          <text x={LW0 / 2} y={5.6} fontFamily={f.mono} fontWeight={700} fontSize={2.2} fill={p.hud} opacity={0.55} textAnchor="middle" letterSpacing={0.3}>
            {nombre}
          </text>
          <rect x={LW0 - 15.5} y={2} width={13} height={4.4} fill={p.colores[tipo === 'ladrillos' ? 2 : 0]} />
          <text x={LW0 - 9} y={5.15} fontFamily={f.mono} fontWeight={700} fontSize={2.5} fill="#fff" textAnchor="middle">
            NIVEL {nivel}
          </text>
        </g>
      </svg>

      {/* Etiqueta «generando» (en px reales, encima del SVG) */}
      {generando ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: alto * 0.08,
            transform: 'translateX(-50%)',
            padding: `${alto * 0.012}px ${alto * 0.02}px`,
            background: '#0a0a0a',
            color: '#fff',
            fontFamily: f.mono,
            fontWeight: 500,
            fontSize: alto * 0.026,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            display: 'flex',
            gap: alto * 0.016,
            alignItems: 'center',
            opacity: 1 - cl((g - G + 4) / 4, 0, 1),
          }}
        >
          <span style={{ width: alto * 0.012, height: alto * 0.012, background: '#fff', opacity: Math.floor(g / 3) % 2 ? 0.3 : 1 }} />
          <span>generando {etapa}</span>
          <span style={{ opacity: 0.55 }}>{String(Math.round(cl(g / G, 0, 1) * 100)).padStart(3, ' ')}%</span>
        </div>
      ) : null}
    </div>
  )
}
