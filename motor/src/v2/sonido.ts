// Sonidos sintetizados en código (licencia limpia): los genera `node scripts/sintetizar-sonido.mjs`.
// Todos los WAV: PCM 16 bit, 48 kHz, estéreo, pico −3 dBFS.
//
// Volúmenes lineales (para `<Audio volume>` con `staticFile(archivo)`), calibrados contra una voz
// de narración mono a ≈ −18,5 LUFS (en la mezcla estéreo ≈ −15,5 LUFS; sílabas fuertes ≈ −11 LUFS
// en ventana de 100 ms). Cada SFX queda entre 14 y 20 dB por debajo de esas sílabas, medido con
// ponderación K en ventana de 100 ms (la de 400 ms subestima los golpes cortos):
//   impacto, sello −14 · exito −15 · pop, whoosh, riser −16 · swish, error −17 · click −18 · tick, teclas −20
// Si tu voz suena más fuerte o más suave, sube o baja todos en la misma proporción.

export type TipoSonido =
  | 'click'
  | 'pop'
  | 'whoosh'
  | 'swish'
  | 'impacto'
  | 'tick'
  | 'teclas'
  | 'error'
  | 'exito'
  | 'sello'
  | 'riser';

/** archivo → `staticFile`; vol lineal; frames = duración a 30 fps (redondeada hacia arriba). */
export const SONIDOS: Record<TipoSonido, { archivo: string; vol: number; frames: number }> = {
  click: { archivo: 'sfx/click.wav', vol: 0.45, frames: 4 },
  pop: { archivo: 'sfx/pop.wav', vol: 0.16, frames: 5 },
  whoosh: { archivo: 'sfx/whoosh.wav', vol: 0.13, frames: 11 },
  swish: { archivo: 'sfx/swish.wav', vol: 0.12, frames: 6 },
  impacto: { archivo: 'sfx/impacto.wav', vol: 0.13, frames: 66 },
  tick: { archivo: 'sfx/tick.wav', vol: 0.24, frames: 2 },
  teclas: { archivo: 'sfx/teclas.wav', vol: 0.15, frames: 36 },
  error: { archivo: 'sfx/error.wav', vol: 0.07, frames: 15 },
  exito: { archivo: 'sfx/exito.wav', vol: 0.13, frames: 30 },
  sello: { archivo: 'sfx/sello.wav', vol: 0.2, frames: 12 },
  // el riser dura 1 s exacto y corta seco: arráncalo 30 frames antes del remate
  riser: { archivo: 'sfx/riser.wav', vol: 0.145, frames: 30 },
};

/**
 * Música por reel, indexada por el número de 3 dígitos del reel (el mismo NNN de src/v2/<NNN>/).
 * `scripts/indice-v2.mjs` la toma con `MUSICA['NNN']`; si no hay entrada, el reel sale sin música.
 *
 * Las pistas las genera `npm run musica` (public/musica/pulso-<NNN>.wav + pulso-<NNN>.beats.json
 * con tempo, quiebre y rejilla de beats). Todas quedan en −20 LUFS integrados y true peak
 * ≤ −11 dBFS, así que vol 0,27 (≈ −11 dB) las deja unos 16 dB bajo la voz en la mezcla.
 * Para un reel nuevo: añade su entrada aquí con la misma forma.
 */
export const MUSICA: Record<string, { archivo: string; vol: number }> = {
  '001': { archivo: 'musica/pulso-001.wav', vol: 0.27 }, // reel de ejemplo «demo»
};
