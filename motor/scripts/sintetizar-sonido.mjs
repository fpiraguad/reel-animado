#!/usr/bin/env node
// Sintetiza en código los SFX y la música de fondo de los reels (licencia limpia: todo sale de aquí).
// Node puro, sin dependencias. Escribe WAV PCM 16 bit, 48 kHz, estéreo. Determinista: PRNG con semilla.
//
//   node scripts/sintetizar-sonido.mjs              → public/sfx/*.wav + public/musica/pulso-<id>.{wav,beats.json}
//   node scripts/sintetizar-sonido.mjs sfx          → solo SFX
//   node scripts/sintetizar-sonido.mjs musica       → solo música (todas las pistas de REELS)
//   node scripts/sintetizar-sonido.mjs musica 001   → solo esa pista
//
// Imprime para cada archivo: duración, pico (dBFS), loudness (LUFS) y, para los SFX, la sonoridad de
// ventana corta (100 ms, ponderación K), útil para fijar los volúmenes de src/v2/sonido.ts.
//
// CÓMO AGREGAR LA MÚSICA DE TU REEL
//   1. Genera la voz (scripts/voz.mjs o scripts/voz-falsa.mjs) y mira cuánto dura la narración
//      (el último `fin` de public/voz/<id>/narracion.json + ~0,8 s de cola).
//   2. Agrega una entrada a la tabla REELS (más abajo) con la clave de tu reel ('002', '003'…):
//        duracion  segundos totales del reel (la pista termina con golpe final 0,5 s antes)
//        quiebre   segundo en que la música se cae (giro del guion: «pero…», «el problema es…»);
//                  la vuelta cae sola en el compás más cercano a quiebre + 8 s
//        bpm       tempo objetivo; se ajusta dentro de `rango` para que el golpe final cuadre
//      Opcionales: semilla, tono (solo informativo), rango [min, max], prog (4 acordes con
//      acorde(raizMidi, 'm9' | 'maj9' | '69' | 'sus')), patronBajo, patronArp, arpDiv, arpCaida,
//      arpAmp, arpBrillo, vel16, palmas, swing, caja, cine. Sin `prog` usa la progresión base
//      (Am9 – Fmaj9 – Dm9 – Em9).
//   3. Corre `node scripts/sintetizar-sonido.mjs musica <id>` y registra la pista en src/v2/sonido.ts
//      (MUSICA['<id>'] = { archivo: 'musica/pulso-<id>.wav', vol: 0.27 }).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000;
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_SFX = join(RAIZ, 'public', 'sfx');
const DIR_MUSICA = join(RAIZ, 'public', 'musica');

// ───────────────────────── utilidades ─────────────────────────

/** PRNG mulberry32: mismo resultado en cada corrida. */
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const dbLin = (db) => 10 ** (db / 20);
const linDb = (x) => 20 * Math.log10(Math.max(x, 1e-12));
const muestras = (seg) => Math.round(seg * SR);
const estereo = (seg) => [new Float32Array(muestras(seg)), new Float32Array(muestras(seg))];

/** Biquad RBJ (lp, hp, bp de pico 0 dB, peak). Se puede re-sintonizar por muestra para barridos. */
class Biquad {
  constructor(tipo = 'lp', f = 1000, q = 0.707, ganDb = 0) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.tipo = tipo;
    this.set(f, q, ganDb);
  }
  set(f, q = 0.707, ganDb = 0) {
    const w = (TAU * Math.min(Math.max(f, 10), SR * 0.45)) / SR;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    switch (this.tipo) {
      case 'lp': b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'hp': b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'bp': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'peak': {
        const A = 10 ** (ganDb / 40);
        b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; break;
      }
      default: throw new Error(`filtro desconocido ${this.tipo}`);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  p(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Envolvente ataque lineal + caída exponencial. */
const env = (t, ataque, caida) => (t < 0 ? 0 : t < ataque ? t / ataque : Math.exp(-(t - ataque) / caida));

/** Paneo de potencia constante, p ∈ [−1, 1]. */
const pan = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

/** Golpe de ruido filtrado sumado a `dest` desde t0 (s). */
function golpeRuido(dest, t0, { amp = 1, f = 3000, q = 1, tipo = 'bp', ataque = 0.0004, caida = 0.004, dur, semilla = 1, p = 0 }) {
  const r = prng(semilla);
  const filtro = new Biquad(tipo, f, q);
  const n = muestras(dur ?? caida * 8 + ataque);
  const i0 = muestras(t0);
  const [gl, gr] = pan(p);
  for (let i = 0; i < n && i0 + i < dest[0].length; i++) {
    const y = filtro.p(r() * 2 - 1) * env(i / SR, ataque, caida) * amp;
    dest[0][i0 + i] += y * gl;
    dest[1][i0 + i] += y * gr;
  }
}

/** Tono senoidal con barrido exponencial de frecuencia (f(t) = f1 + (f0 − f1)·e^(−t/τ)). */
function golpeTono(dest, t0, { amp = 1, f0, f1 = f0, tau = 0.05, ataque = 0.001, caida = 0.05, dur, armonicos = [1], p = 0, fase = 0 }) {
  const n = muestras(dur ?? caida * 8 + ataque);
  const i0 = muestras(t0);
  const [gl, gr] = pan(p);
  let ph = fase;
  for (let i = 0; i < n && i0 + i < dest[0].length; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / tau);
    ph += f / SR;
    let s = 0;
    for (let h = 0; h < armonicos.length; h++) s += armonicos[h] * Math.sin(TAU * ph * (h + 1));
    const y = s * env(t, ataque, caida) * amp;
    dest[0][i0 + i] += y * gl;
    dest[1][i0 + i] += y * gr;
  }
}

/** Reverb tipo Freeverb (8 combs + 4 allpass por canal). Devuelve [L, R] húmedos. */
function reverb(entrada, { tam = 0.82, amort = 0.3, colaSeg = 0 } = {}) {
  const k = SR / 44100;
  const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const APS = [556, 441, 341, 225];
  const n = entrada.length + muestras(colaSeg);
  const salida = [new Float32Array(n), new Float32Array(n)];
  for (let canal = 0; canal < 2; canal++) {
    const extra = canal * 23;
    const combs = COMBS.map((d) => ({ buf: new Float32Array(Math.round((d + extra) * k)), i: 0, filt: 0 }));
    const aps = APS.map((d) => ({ buf: new Float32Array(Math.round((d + extra) * k)), i: 0 }));
    const out = salida[canal];
    for (let i = 0; i < n; i++) {
      const x = (i < entrada.length ? entrada[i] : 0) * 0.015;
      let s = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.filt = y * (1 - amort) + c.filt * amort;
        c.buf[c.i] = x + c.filt * tam;
        c.i = (c.i + 1) % c.buf.length;
        s += y;
      }
      for (const a of aps) {
        const b = a.buf[a.i];
        a.buf[a.i] = s + b * 0.5;
        s = b - s;
        a.i = (a.i + 1) % a.buf.length;
      }
      out[i] = s;
    }
  }
  return salida;
}

// ───────────────────────── medición (BS.1770) ─────────────────────────

/** Filtro K (48 kHz) sobre un canal, devuelve las potencias instantáneas. */
function potenciaK(canal) {
  const s1 = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] };
  const s2 = { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] };
  const out = new Float64Array(canal.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, u1 = 0, u2 = 0, z1 = 0, z2 = 0;
  for (let i = 0; i < canal.length; i++) {
    const x = canal[i];
    const y = s1.b[0] * x + s1.b[1] * x1 + s1.b[2] * x2 - s1.a[0] * y1 - s1.a[1] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    const z = s2.b[0] * y + s2.b[1] * u1 + s2.b[2] * u2 - s2.a[0] * z1 - s2.a[1] * z2;
    u2 = u1; u1 = y; z2 = z1; z1 = z;
    out[i] = z * z;
  }
  return out;
}

/** Loudness integrada (con compuertas), máxima momentánea (400 ms) y máxima de ventana corta (100 ms). */
function medir(chs) {
  const minN = muestras(0.4);
  const n = Math.max(chs[0].length, minN);
  const acum = new Float64Array(n + 1);
  for (const ch of chs) {
    const pw = potenciaK(ch);
    for (let i = 0; i < pw.length; i++) acum[i + 1] += pw[i];
  }
  for (let i = 1; i <= n; i++) acum[i] += acum[i - 1];
  const bloques = (largo, paso) => {
    const v = [];
    for (let i = 0; i + largo <= n; i += paso) v.push((acum[i + largo] - acum[i]) / largo);
    return v;
  };
  const lufs = (z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-20));
  const b400 = bloques(minN, muestras(0.1));
  const abs = b400.filter((z) => lufs(z) > -70);
  const media = (v) => v.reduce((a, b) => a + b, 0) / Math.max(v.length, 1);
  const rel = lufs(media(abs)) - 10;
  const integrada = lufs(media(abs.filter((z) => lufs(z) > rel)));
  const momentanea = lufs(Math.max(...b400));
  const corta = lufs(Math.max(...bloques(muestras(0.1), muestras(0.01))));
  let pico = 0;
  for (const ch of chs) for (const x of ch) pico = Math.max(pico, Math.abs(x));
  return { integrada, momentanea, corta, pico: linDb(pico) };
}

// ───────────────────────── escritura ─────────────────────────

function escribirWav(ruta, [L, R]) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  // Dither TPDF determinista para que las colas no se corten en escalones.
  const r = prng(4242);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 2; c++) {
      const x = (c ? R : L)[i];
      const d = (r() - r()) / 32768;
      const v = Math.max(-32768, Math.min(32767, Math.round((x + d) * 32767)));
      buf.writeInt16LE(v, 44 + i * 4 + c * 2);
    }
  }
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, buf);
}

/** Fundidos de borde (evita clics) y normalización de pico. */
function terminar(chs, { picoDb = -3, fadeIn = 0.0005, fadeOut = 0.01 } = {}) {
  const n = chs[0].length;
  const fi = muestras(fadeIn), fo = muestras(fadeOut);
  let pico = 0;
  for (const ch of chs) {
    for (let i = 0; i < fi; i++) ch[i] *= i / fi;
    for (let i = 0; i < fo; i++) ch[n - 1 - i] *= i / fo;
    for (const x of ch) pico = Math.max(pico, Math.abs(x));
  }
  const g = dbLin(picoDb) / Math.max(pico, 1e-9);
  for (const ch of chs) for (let i = 0; i < n; i++) ch[i] *= g;
  return chs;
}

// ───────────────────────── SFX ─────────────────────────

const SFX = {
  /** Clic de mouse seco: presión + suelta 55 ms después. */
  click() {
    const o = estereo(0.11);
    for (const [t0, a, s] of [[0, 1, 11], [0.055, 0.45, 12]]) {
      golpeRuido(o, t0, { amp: a, f: 4300, q: 1.6, caida: 0.0011, semilla: s });
      golpeRuido(o, t0, { amp: a * 0.5, f: 1500, q: 2.2, caida: 0.0035, semilla: s + 10 });
      golpeTono(o, t0, { amp: a * 0.12, f0: 2600, tau: 1, caida: 0.003 });
    }
    return o;
  },

  /** Pop de UI: burbuja que sube de tono, brillante y corta. */
  pop() {
    const o = estereo(0.14);
    golpeTono(o, 0, { amp: 1, f0: 380, f1: 1250, tau: 0.014, ataque: 0.0012, caida: 0.032, armonicos: [1, 0.22, 0.06] });
    golpeRuido(o, 0, { amp: 0.25, tipo: 'hp', f: 3500, q: 0.7, caida: 0.0012, semilla: 21 });
    return o;
  },

  /** Whoosh: barrido de ruido filtrado de 0,35 s que cruza de izquierda a derecha. */
  whoosh() {
    return barrido({ dur: 0.35, pico: 0.21, f: [380, 2600, 900], q: 1.3, paneo: [-0.6, 0.6], semilla: 31, cuerpo: 0.5 });
  },

  /** Swish: más corto, agudo y seco. */
  swish() {
    return barrido({ dur: 0.18, pico: 0.085, f: [1300, 5600, 2600], q: 1.9, paneo: [-0.3, 0.4], semilla: 41, cuerpo: 0.15 });
  },

  /** Impacto cinematográfico: sub con caída de tono + punch + cola reverberada. */
  impacto() {
    const dur = 2.2;
    const seco = new Float32Array(muestras(dur));
    const r = prng(51);
    const lpPunch = new Biquad('lp', 1900, 0.8);
    const lpCola = new Biquad('lp', 650, 0.7);
    let ph = 0, ph2 = 0;
    for (let i = 0; i < seco.length; i++) {
      const t = i / SR;
      const f = 40 + 85 * Math.exp(-t / 0.06);
      ph += f / SR; ph2 += (f * 3.01) / SR;
      const sub = Math.tanh(1.6 * Math.sin(TAU * ph)) * env(t, 0.002, 0.8);
      const medio = Math.sin(TAU * ph2) * env(t, 0.002, 0.16) * 0.45; // cuerpo audible en parlante de celular
      const ruido = r() * 2 - 1;
      const punch = lpPunch.p(ruido) * env(t, 0.0005, 0.03) * 1.1;
      const cola = lpCola.p(ruido) * env(t, 0.01, 0.45) * 0.28;
      seco[i] = sub * 0.9 + medio + punch + cola;
    }
    const [hl, hr] = reverb(seco, { tam: 0.86, amort: 0.45 });
    const o = estereo(dur);
    for (let i = 0; i < seco.length; i++) {
      o[0][i] = seco[i] + hl[i] * 0.9;
      o[1][i] = seco[i] + hr[i] * 0.9;
    }
    return terminarCola(o, 0.5);
  },

  /** Tic de contador: muy corto y agudo. */
  tick() {
    const o = estereo(0.045);
    golpeTono(o, 0, { amp: 0.7, f0: 3150, tau: 1, ataque: 0.0003, caida: 0.0055 });
    golpeTono(o, 0, { amp: 0.35, f0: 1580, tau: 1, ataque: 0.0003, caida: 0.009 });
    golpeRuido(o, 0, { amp: 0.5, f: 6500, q: 1.2, caida: 0.0007, semilla: 61 });
    return o;
  },

  /** ≈1,2 s de tecleo de teclado mecánico, golpes irregulares deterministas. */
  teclas() {
    const dur = 1.2;
    const o = estereo(dur);
    const r = prng(77);
    let t = 0.015;
    let k = 0;
    while (t < dur - 0.09) {
      const espacio = k === 8;
      const a = espacio ? 1 : 0.55 + 0.4 * r();
      const p = espacio ? 0 : (r() - 0.5) * 0.5;
      const s = 700 + k * 7;
      // golpe de la tecla (switch) y fondo de carrera 4–6 ms después
      golpeRuido(o, t, { amp: a, f: espacio ? 1700 : 2400 + 1700 * r(), q: 1.4, caida: 0.0016, semilla: s, p });
      const fondo = t + 0.004 + 0.002 * r();
      golpeTono(o, fondo, { amp: a * 0.4, f0: (espacio ? 130 : 190 + 90 * r()) * 1.25, f1: espacio ? 130 : 190 + 60 * r(), tau: 0.006, ataque: 0.0005, caida: espacio ? 0.02 : 0.011, p });
      golpeRuido(o, fondo, { amp: a * 0.45, f: 1100 + 500 * r(), q: 1.2, caida: 0.003, semilla: s + 1, p });
      if (espacio) golpeRuido(o, fondo + 0.012, { amp: 0.25, f: 3200, q: 3, caida: 0.006, semilla: s + 2 });
      // suelta de la tecla
      golpeRuido(o, t + 0.06 + 0.02 * r(), { amp: a * 0.18, f: 3000 + 1000 * r(), q: 1.5, caida: 0.0012, semilla: s + 3, p });
      t += 0.05 + 0.085 * r() + (r() < 0.12 ? 0.11 : 0);
      k++;
    }
    return o;
  },

  /** Error: dos tonos descendentes (Do5 → La4), suaves y redondos. */
  error() {
    const o = estereo(0.5);
    const tono = (t0, f, largo) => {
      const i0 = muestras(t0), n = muestras(largo + 0.12);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        ph += f / SR;
        const e = t < 0.008 ? t / 0.008 : t < largo ? 1 - 0.25 * ((t - 0.008) / largo) : 0.75 * Math.exp(-(t - largo) / 0.03);
        const y = (Math.sin(TAU * ph) + 0.18 * Math.sin(TAU * ph * 2) + 0.05 * Math.sin(TAU * ph * 3)) * e;
        o[0][i0 + i] += y; o[1][i0 + i] += y;
      }
    };
    tono(0, midiHz(72), 0.12);
    tono(0.16, midiHz(69), 0.16);
    return o;
  },

  /** Éxito: campanitas ascendentes Sol5–Do6–Mi6–Sol6 con un poco de sala. */
  exito() {
    const dur = 1.0;
    const seco = estereo(dur);
    [79, 84, 88, 91].forEach((m, j) => {
      const f = midiHz(m);
      const t0 = j * 0.06;
      const p = -0.3 + j * 0.2;
      golpeTono(seco, t0, { amp: 0.5, f0: f, tau: 1, ataque: 0.002, caida: 0.32, dur: dur - t0, p });
      golpeTono(seco, t0, { amp: 0.12, f0: f * 2.76, tau: 1, ataque: 0.001, caida: 0.07, dur: 0.5, p });
      golpeTono(seco, t0, { amp: 0.08, f0: f * 2, tau: 1, ataque: 0.002, caida: 0.15, dur: 0.6, p });
    });
    const mono = seco[0].map((x, i) => (x + seco[1][i]) / 2);
    const [hl, hr] = reverb(mono, { tam: 0.78, amort: 0.4 });
    for (let i = 0; i < seco[0].length; i++) { seco[0][i] += hl[i] * 0.5; seco[1][i] += hr[i] * 0.5; }
    return terminarCola(seco, 0.25);
  },

  /** Sello de goma: thump grave + cuerpo de goma + chasquido, y el despegue. */
  sello() {
    const o = estereo(0.4);
    golpeTono(o, 0, { amp: 1, f0: 150, f1: 58, tau: 0.02, ataque: 0.001, caida: 0.07 });
    golpeRuido(o, 0, { amp: 0.7, f: 340, q: 1, ataque: 0.001, caida: 0.03, semilla: 81 });
    golpeRuido(o, 0.003, { amp: 0.75, f: 2500, q: 0.9, caida: 0.004, semilla: 82 });
    golpeRuido(o, 0.2, { amp: 0.1, tipo: 'hp', f: 2800, q: 0.7, ataque: 0.004, caida: 0.012, semilla: 83 });
    return o;
  },

  /** Riser de 1 s: ruido y tono que suben con trémolo que se acelera; corta seco al remate. */
  riser() {
    const dur = 1.0;
    const o = estereo(dur);
    const rL = prng(91), rR = prng(92);
    const bpL = new Biquad('bp', 300, 2.5), bpR = new Biquad('bp', 300, 2.5);
    let ph = 0, phT = 0;
    for (let i = 0; i < o[0].length; i++) {
      const t = i / SR;
      const u = t / dur;
      const fc = 300 * 20 ** (u ** 1.4);
      if (i % 16 === 0) { bpL.set(fc, 2.5); bpR.set(fc * 1.04, 2.5); }
      const f = 180 * (1400 / 180) ** (u ** 1.6);
      ph += f / SR;
      phT += (4 + 14 * u) / SR;
      const trem = 0.75 + 0.25 * Math.sin(TAU * phT);
      const e = u ** 2.2;
      const tono = Math.sin(TAU * ph) * 0.3;
      o[0][i] = (bpL.p(rL() * 2 - 1) * 1.6 + tono) * e * trem;
      o[1][i] = (bpR.p(rR() * 2 - 1) * 1.6 + tono) * e * trem;
    }
    return o;
  },
};

/** Barrido de ruido (whoosh/swish): banda que sube y baja, envolvente asimétrica y paneo. */
function barrido({ dur, pico, f: [fa, fb, fc], q, paneo: [pa, pb], semilla, cuerpo }) {
  const o = estereo(dur);
  const r = prng(semilla);
  const bp = new Biquad('bp', fa, q);
  const bp2 = new Biquad('bp', fa * 1.5, q * 1.4);
  const lp = new Biquad('lp', 500, 0.7);
  for (let i = 0; i < o[0].length; i++) {
    const t = i / SR;
    const f = t < pico ? fa * (fb / fa) ** (t / pico) : fb * (fc / fb) ** ((t - pico) / (dur - pico));
    if (i % 16 === 0) { bp.set(f, q); bp2.set(f * 1.5, q * 1.4); }
    const e = t < pico ? (t / pico) ** 2 : 0.5 + 0.5 * Math.cos((Math.PI * (t - pico)) / (dur - pico));
    const x = r() * 2 - 1;
    const y = (bp.p(x) + bp2.p(x) * 0.5 + lp.p(x) * cuerpo * 0.4) * e;
    const [gl, gr] = pan(pa + (pb - pa) * (t / dur));
    o[0][i] = y * gl;
    o[1][i] = y * gr;
  }
  return o;
}

/** Fundido final largo para sonidos con cola. */
function terminarCola(o, seg) {
  const n = o[0].length, m = muestras(seg);
  for (const ch of o) for (let i = 0; i < m; i++) ch[n - m + i] *= 0.5 + 0.5 * Math.cos((Math.PI * i) / m);
  return o;
}

// ───────────────────────── música: «pulso» ─────────────────────────

// Pista base (la que usa musica() si se llama sin configuración).
const MUS = {
  bpm: 120,
  durArchivo: 63,
  fin: 62.5, // cierre limpio
  ultimoGolpe: 62, // último downbeat: golpe final
  quiebre: { inicio: 25, vuelta: 34 },
  arpDesde: 4,
  rimDesde: 8,
};

// Progresión base, 1 compás por acorde: Am9 – Fmaj9 – Dm9 – Em9
const PROG_BASE = [
  { raiz: 45, notas: [57, 60, 64, 67, 71] },
  { raiz: 41, notas: [53, 57, 60, 64, 67] },
  { raiz: 38, notas: [50, 53, 57, 60, 64] },
  { raiz: 40, notas: [52, 55, 59, 62, 66] },
];

// ── una pista por reel: misma mezcla que la base, otra semilla, tonalidad, progresión y tempo.
// El tempo se ajusta (dentro de `rango`) para que el último downbeat caiga 0,5 s antes de `duracion`
// (golpe final + fundido limpio), y la vuelta del quiebre cae en el downbeat más cercano a quiebre + 8 s.

/** Acorde de 5 notas una octava sobre la raíz. */
const TIPOS = {
  m9: [12, 15, 19, 22, 26],
  maj9: [12, 16, 19, 23, 26],
  '69': [12, 16, 19, 21, 26],
  sus: [12, 14, 19, 22, 26],
};
const acorde = (raiz, tipo) => ({ raiz, notas: TIPOS[tipo].map((x) => raiz + x) });

// Tabla de pistas: una entrada por reel (ver «Cómo agregar la música de tu reel» arriba).
const REELS = {
  '001': { duracion: 20, quiebre: 8.4, bpm: 118, semilla: 1001, tono: 'La menor', rango: [100, 126], // i–VI–III–VII
    prog: [acorde(45, 'm9'), acorde(41, 'maj9'), acorde(48, 'maj9'), acorde(43, 'sus')],
    patronArp: [0, 2, 4, 2, 3, 1, 4, 2] },
};


/** Config de `musica()` a partir de duración y quiebre del reel. */
function configReel({ duracion, quiebre, bpm: objetivo, rango: [bMin, bMax] = [110, 124], ...resto }) {
  const ultimoGolpe = duracion - 0.5;
  // número de compases que deja el tempo más cerca del objetivo, sin salir del rango (110–124 por defecto)
  let mejor = null;
  for (let n = 1; n < 200; n++) {
    const bpm = (240 * n) / ultimoGolpe;
    if (bpm < bMin || bpm > bMax) continue;
    if (!mejor || Math.abs(bpm - objetivo) < Math.abs(mejor.bpm - objetivo)) mejor = { n, bpm };
  }
  const { n, bpm } = mejor;
  const BEAT = 60 / bpm;
  const COMPAS = BEAT * 4;
  let kVuelta = Math.round((quiebre + 8) / COMPAS);
  // quiebre tardío: si la vuelta no deja al menos 1 compás antes del golpe final, vuelve en el último
  // downbeat que sí lo deja (y nunca antes de 2 s de quiebre, para que quepa la subida)
  if (kVuelta > n - 1) kVuelta = Math.max(n - 1, Math.ceil((quiebre + 2) / COMPAS));
  return {
    ...resto,
    bpm,
    durArchivo: +(duracion + 0.5).toFixed(2),
    fin: duracion,
    ultimoGolpe: n * COMPAS,
    quiebre: { inicio: quiebre, vuelta: kVuelta * 4 * BEAT },
    arpDesde: 4,
    rimDesde: 8,
  };
}

function musica(M = MUS) {
  const semilla = M.semilla ?? 2026;
  const PROG = M.prog ?? PROG_BASE;
  const cerca = (a, b) => Math.abs(a - b) < 1e-6;
  const BEAT = 60 / M.bpm;
  const COMPAS = BEAT * 4;
  const N = muestras(M.durArchivo);
  const r = prng(semilla);
  const enQuiebre = (t) => t >= M.quiebre.inicio - 1e-9 && t < M.quiebre.vuelta - 1e-9;
  const acordeEn = (t) => PROG[Math.floor(t / COMPAS) % PROG.length];

  const tambores = [new Float32Array(N), new Float32Array(N)];
  const bajo = new Float32Array(N);
  const pad = [new Float32Array(N), new Float32Array(N)];
  const arp = new Float32Array(N);
  const envio = new Float32Array(N); // envío a reverb (mono)

  // ── bombo, a negras; ninguno en el quiebre; golpe final en `ultimoGolpe`
  const bombos = [];
  for (let b = 0; b * BEAT <= M.ultimoGolpe + 1e-9; b++) {
    const t = b * BEAT;
    if (!enQuiebre(t)) bombos.push(t);
  }
  for (const t of bombos) {
    const fuerte = Math.round(t / BEAT) % 2 === 0;
    golpeTono(tambores, t, { amp: fuerte ? 0.9 : 0.75, f0: 160, f1: 47, tau: 0.032, ataque: 0.0012, caida: cerca(t, M.ultimoGolpe) ? 0.35 : 0.2, dur: 0.6 });
    golpeRuido(tambores, t, { amp: 0.05, tipo: 'hp', f: 2500, q: 0.7, caida: 0.003, semilla: 1000 + bombos.indexOf(t) });
  }
  // la caída del quiebre: sub que se hunde
  golpeTono(tambores, M.quiebre.inicio, { amp: 0.8, f0: 70, f1: 32, tau: 0.6, ataque: 0.003, caida: 0.9, dur: 3 });

  // pumping (sidechain) a partir de los bombos
  const sc = new Float32Array(N);
  for (const t of bombos) {
    const i0 = muestras(t);
    for (let i = 0; i < muestras(0.5) && i0 + i < N; i++) {
      const dt = i / SR;
      sc[i0 + i] = Math.max(sc[i0 + i], dt < 0.006 ? dt / 0.006 : Math.exp(-(dt - 0.006) / 0.13));
    }
  }

  // ── hats: abierto en el contratiempo, cerrados a semicorcheas suaves
  const VEL16 = M.vel16 ?? [0.35, 0.16, 0, 0.22];
  let h = 0;
  for (let s = 0; s * BEAT / 4 < M.ultimoGolpe; s++) {
    let t = (s * BEAT) / 4;
    if (M.swing && s % 2) t += (M.swing * BEAT) / 4; // swing de semicorcheas (juguetón)
    const p = s % 2 ? 0.25 : -0.15;
    if (enQuiebre(t)) {
      // subida de hats en los últimos 2 s del quiebre
      if (t >= M.quiebre.vuelta - 2) {
        const u = (t - (M.quiebre.vuelta - 2)) / 2;
        golpeRuido(tambores, t, { amp: 0.05 + 0.3 * u * u, tipo: 'hp', f: 8000, q: 0.8, caida: 0.012, semilla: 5000 + h++, p });
      }
      continue;
    }
    const pos = s % 4;
    if (pos === 2) {
      golpeRuido(tambores, t, { amp: 0.42, tipo: 'hp', f: 7500, q: 0.7, caida: 0.055, dur: 0.2, semilla: 5000 + h++, p: 0.2 });
    } else {
      const v = VEL16[pos] * (0.85 + 0.3 * r());
      golpeRuido(tambores, t, { amp: v, tipo: 'hp', f: 9000, q: 0.8, caida: 0.011, semilla: 5000 + h++, p });
    }
  }

  // ── rim en 2 y 4, muy suave y con sala
  const rim = [new Float32Array(N), new Float32Array(N)];
  for (let b = 0; b * BEAT < M.ultimoGolpe; b++) {
    const t = b * BEAT;
    if (b % 2 === 0 || t < M.rimDesde || enQuiebre(t)) continue;
    if (M.caja) {
      // caja synthwave: cuerpo grave + ruido arriba de 5 kHz (deja libre la voz), mucha sala
      golpeTono(rim, t, { amp: 0.32, f0: 230, f1: 175, tau: 0.04, caida: 0.07 });
      golpeRuido(rim, t, { amp: 0.1, f: 1200, q: 0.9, caida: 0.03, semilla: 9000 + b });
      golpeRuido(rim, t, { amp: 0.3, tipo: 'hp', f: 5500, q: 0.7, caida: 0.09, semilla: 9500 + b });
    } else if (M.palmas) {
      // palmas: tres ráfagas cortas y una cola
      for (const [k, d] of [[0, 0], [1, 0.011], [2, 0.023]]) {
        golpeRuido(rim, t + d, { amp: 0.16, f: 1400, q: 1.1, caida: 0.005, semilla: 9000 + b * 4 + k, p: 0.1 });
      }
      golpeRuido(rim, t + 0.03, { amp: 0.12, tipo: 'hp', f: 4500, q: 0.7, caida: 0.045, semilla: 9000 + b * 4 + 3, p: 0.1 });
    } else {
      golpeRuido(rim, t, { amp: 0.22, f: 3200, q: 2, caida: 0.01, semilla: 9000 + b, p: 0.15 });
      golpeTono(rim, t, { amp: 0.06, f0: 1900, tau: 1, caida: 0.006, p: 0.15 });
    }
  }
  if (M.cine) {
    // cine: boom grave al inicio de cada frase de 4 compases y redoble de toms al final de la frase
    for (let c = 0; c * COMPAS <= M.ultimoGolpe; c++) {
      const t0 = c * COMPAS;
      if (enQuiebre(t0)) continue;
      if (c % 4 === 0) golpeTono(rim, t0, { amp: 0.55, f0: 62, f1: 34, tau: 0.5, ataque: 0.004, caida: 0.7, dur: 2.5 });
      if (c % 4 === 3) {
        const tomes = [[2, 150, -0.4], [2.5, 125, 0], [3, 105, 0.3], [3.5, 88, 0.5]];
        for (const [beat, f0, p] of tomes) {
          const t = t0 + beat * BEAT;
          if (t >= M.ultimoGolpe || enQuiebre(t)) continue;
          golpeTono(rim, t, { amp: 0.45, f0: f0 * 1.6, f1: f0, tau: 0.03, caida: 0.18, dur: 0.8, p });
        }
      }
    }
  }
  for (let i = 0; i < N; i++) {
    tambores[0][i] += rim[0][i]; tambores[1][i] += rim[1][i];
    envio[i] += (rim[0][i] + rim[1][i]) * 0.6;
  }

  // ── platillo suave al volver del quiebre + ruido que sube antes
  {
    const r2 = prng(333);
    const hpL = new Biquad('hp', 5000, 0.7), hpR = new Biquad('hp', 5000, 0.7);
    const i0 = muestras(M.quiebre.vuelta);
    for (let i = 0; i < muestras(2.5); i++) {
      const e = env(i / SR, 0.002, 0.7) * 0.2;
      tambores[0][i0 + i] += hpL.p(r2() * 2 - 1) * e;
      tambores[1][i0 + i] += hpR.p(r2() * 2 - 1) * e;
    }
    const bp = new Biquad('bp', 500, 1.5);
    const iA = muestras(M.quiebre.vuelta - 2);
    for (let i = 0; i < muestras(2); i++) {
      const u = i / muestras(2);
      if (i % 32 === 0) bp.set(500 * 10 ** u, 1.5);
      const y = bp.p(r2() * 2 - 1) * 0.16 * u * u;
      tambores[0][iA + i] += y; tambores[1][iA + i] += y;
    }
  }

  // ── bajo cálido (con armónicos para que se oiga en el celular), fuera en el quiebre
  const PATRON_BAJO = M.patronBajo ?? [[0, 1.25, 0], [1.5, 0.4, 0], [2, 0.9, 0], [3.5, 0.4, 7]];
  {
    const lp = new Biquad('lp', 420, 0.8);
    const notas = [];
    for (let c = 0; c * COMPAS <= M.ultimoGolpe; c++) {
      for (const [ini, largo, semi] of PATRON_BAJO) {
        const t = c * COMPAS + ini * BEAT;
        if (t > M.ultimoGolpe || enQuiebre(t)) continue;
        const final = cerca(t, M.ultimoGolpe);
        notas.push({ t, largo: final ? 0.5 : largo * BEAT, f: midiHz(acordeEn(t).raiz + semi) });
      }
    }
    for (const { t, largo, f } of notas) {
      const i0 = muestras(t), n = muestras(largo + 0.05);
      let ph = 0;
      for (let i = 0; i < n && i0 + i < N; i++) {
        const dt = i / SR;
        ph += f / SR;
        const e = (dt < 0.006 ? dt / 0.006 : 1) * (dt > largo ? Math.exp(-(dt - largo) / 0.015) : 1) * (1 - 0.25 * Math.min(dt / largo, 1));
        bajo[i0 + i] += Math.tanh(1.8 * (Math.sin(TAU * ph) + 0.3 * Math.sin(TAU * ph * 2))) * e * 0.4;
      }
    }
    for (let i = 0; i < N; i++) bajo[i] = lp.p(bajo[i]) * (1 - 0.55 * sc[i]);
  }

  // ── pad: sierras desafinadas, filtradas abajo para dejar el hueco de la voz
  {
    const blep = (t, dt) => (t < dt ? ((t /= dt), t + t - t * t - 1) : t > 1 - dt ? ((t = (t - 1) / dt), t * t + t + t + 1) : 0);
    for (let c = 0; c * COMPAS <= M.ultimoGolpe; c++) {
      const t0 = c * COMPAS;
      const { notas } = acordeEn(t0);
      const largo = cerca(t0, M.ultimoGolpe) ? M.fin - t0 : COMPAS;
      const i0 = muestras(t0), n = muestras(largo + 0.6);
      for (const m of notas) {
        for (const [desaf, p] of [[-0.07, -0.7], [0, 0], [0.07, 0.7]]) {
          const f = midiHz(m + desaf);
          const dt = f / SR;
          const [gl, gr] = pan(p);
          let ph = r();
          for (let i = 0; i < n && i0 + i < N; i++) {
            const tt = i / SR;
            ph += dt; if (ph >= 1) ph -= 1;
            const e = Math.min(tt / 0.18, 1) * (tt > largo ? Math.exp(-(tt - largo) / 0.2) : 1);
            const y = (2 * ph - 1 - blep(ph, dt)) * e * 0.035;
            pad[0][i0 + i] += y * gl; pad[1][i0 + i] += y * gr;
          }
        }
      }
    }
    // filtro del pad: se cierra en el quiebre y se abre en la subida
    const corte = (t) => {
      const { inicio, vuelta } = M.quiebre;
      if (t < inicio) return 850;
      if (t < inicio + 1) return 850 - 400 * (t - inicio);
      if (t < vuelta - 2) return 450;
      if (t < vuelta) return 450 + 1100 * ((t - (vuelta - 2)) / 2) ** 2;
      if (t < vuelta + 0.5) return 1550 - 700 * ((t - vuelta) / 0.5);
      return 850;
    };
    const fL = [new Biquad('lp', 850, 0.6), new Biquad('lp', 850, 0.6)];
    const fR = [new Biquad('lp', 850, 0.6), new Biquad('lp', 850, 0.6)];
    for (let i = 0; i < N; i++) {
      if (i % 64 === 0) { const f = corte(i / SR); for (const b of [...fL, ...fR]) b.set(f, 0.6); }
      const g = 1 - (enQuiebre(i / SR) ? 0 : 0.35 * sc[i]);
      pad[0][i] = fL[1].p(fL[0].p(pad[0][i])) * g;
      pad[1][i] = fR[1].p(fR[0].p(pad[1][i])) * g;
      envio[i] += (pad[0][i] + pad[1][i]) * 0.25;
    }
  }

  // ── arpegio discreto a corcheas, una octava arriba del pad; ralo en el quiebre
  {
    const PATRON = M.patronArp ?? [0, 2, 4, 1, 3, 2, 4, 1];
    const DIV = M.arpDiv ?? 2; // notas por negra (2 = corcheas)
    const CAIDA = M.arpCaida ?? 0.09, AMP = M.arpAmp ?? 0.11;
    for (let k = 0; k * BEAT / DIV < M.ultimoGolpe; k++) {
      const t = (k * BEAT) / DIV;
      if (t < M.arpDesde) continue;
      if (enQuiebre(t) && k % (2 * DIV) !== 0) continue;
      const { notas } = acordeEn(t);
      const f = midiHz(notas[PATRON[k % PATRON.length]] + 12);
      const acento = k % (4 * DIV) === 0 ? 1 : 0.7;
      const i0 = muestras(t), n = muestras(M.arpCaida ? Math.max(0.5, CAIDA * 6) : 0.5);
      let ph = 0;
      for (let i = 0; i < n && i0 + i < N; i++) {
        const dt = i / SR;
        ph += f / SR;
        let y = Math.sin(TAU * ph) + 0.12 * Math.sin(TAU * ph * 2);
        if (M.arpBrillo) y += 0.25 * Math.sin(TAU * ph * 2) + 0.15 * Math.sin(TAU * ph * 3) + 0.08 * Math.sin(TAU * ph * 4);
        arp[i0 + i] += y * env(dt, 0.003, CAIDA) * AMP * acento;
      }
    }
  }

  // ── mezcla
  const L = new Float32Array(N), R = new Float32Array(N);
  // delay ping-pong de 3/16 para el arpegio
  const D = muestras((BEAT * 3) / 4);
  const dl = new Float32Array(N), dr = new Float32Array(N);
  for (let i = D; i < N; i++) {
    dl[i] = arp[i - D] * 0.5 + dr[i - D] * 0.38;
    dr[i] = dl[i - D] * 0.75;
  }
  for (let i = 0; i < N; i++) envio[i] += arp[i] * 0.6;
  const [revL, revR] = reverb(envio, { tam: 0.84, amort: 0.35 });
  const hpL = new Biquad('hp', 28, 0.7), hpR = new Biquad('hp', 28, 0.7);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let l = tambores[0][i] + bajo[i] + pad[0][i] + arp[i] * 0.7 + dl[i] * 0.45 + revL[i] * 0.55;
    let rr = tambores[1][i] + bajo[i] + pad[1][i] + arp[i] * 0.7 + dr[i] * 0.45 + revR[i] * 0.55;
    // cierre limpio: fundido en los últimos 0,4 s antes de `fin` y silencio hasta el final del archivo
    const fade = t < M.fin - 0.4 ? 1 : t < M.fin ? 0.5 + 0.5 * Math.cos((Math.PI * (t - (M.fin - 0.4))) / 0.4) : 0;
    L[i] = Math.tanh(hpL.p(l) * 1.2) * fade;
    R[i] = Math.tanh(hpR.p(rr) * 1.2) * fade;
  }

  // normalizar a −20 LUFS integrados
  const m = medir([L, R]);
  const g = dbLin(-20 - m.integrada);
  for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }

  const beats = [];
  const downbeats = [];
  for (let b = 0; b * BEAT <= M.fin + 1e-9; b++) {
    const t = +(b * BEAT).toFixed(3);
    beats.push(t);
    if (b % 4 === 0) downbeats.push(t);
  }
  return {
    audio: [L, R],
    beats: {
      bpm: +M.bpm.toFixed(3),
      duracion: M.durArchivo,
      fin: M.fin,
      quiebre: { inicio: +M.quiebre.inicio.toFixed(3), vuelta: +M.quiebre.vuelta.toFixed(3) },
      beats,
      downbeats,
    },
  };
}

// ───────────────────────── main ─────────────────────────

const que = process.argv[2] ?? 'todo';
const fila = (nombre, chs, extra = '') => {
  const m = medir(chs);
  const dur = chs[0].length / SR;
  console.log(
    `${nombre.padEnd(14)} ${dur.toFixed(3).padStart(6)} s  ${String(Math.ceil(dur * 30)).padStart(4)} f  pico ${m.pico.toFixed(1).padStart(6)} dBFS  ` +
      `I ${m.integrada.toFixed(1).padStart(6)}  M ${m.momentanea.toFixed(1).padStart(6)}  S100 ${m.corta.toFixed(1).padStart(6)} LUFS ${extra}`,
  );
};

if (que === 'todo' || que === 'sfx') {
  for (const [nombre, fn] of Object.entries(SFX)) {
    const chs = terminar(fn(), { picoDb: -3 });
    escribirWav(join(DIR_SFX, `${nombre}.wav`), chs);
    fila(nombre, chs);
  }
}
if (que === 'todo' || que === 'musica') {
  // `musica 001 002` → solo esas pistas
  const solo = process.argv.slice(3);
  const faltan = solo.filter((id) => !REELS[id]);
  if (faltan.length) throw new Error(`No hay pista para ${faltan.join(', ')}: agrégala a la tabla REELS`);
  const pistas = Object.entries(REELS).map(([id, r]) => [id, configReel(r)]);
  for (const [id, cfg] of pistas) {
    if (solo.length && !solo.includes(id)) continue;
    const { audio, beats } = musica(cfg);
    escribirWav(join(DIR_MUSICA, `pulso-${id}.wav`), audio);
    writeFileSync(join(DIR_MUSICA, `pulso-${id}.beats.json`), JSON.stringify(beats, null, 2) + '\n');
    fila(`pulso-${id}`, audio, `${beats.bpm} BPM ${cfg.tono ?? 'La menor'} quiebre ${beats.quiebre.inicio}–${beats.quiebre.vuelta}`);
  }
}
