# MOTION.md — gramática visual de los reels

Síntesis de métodos de motion designers que trabajan con Claude + Remotion, del análisis cuadro a
cuadro de reels virales (`ANALIZAR.md`) y de lo que funciona en los canales grandes de videos
explicativos verticales. Sirve para cualquier tema: el reel debe ser muy visual, dinámico, mostrar
las cosas armándose y en movimiento, con color cuando sume.

## 1. Tesis
- **El prompt es el 10 %; el 90 % es el arnés**: reglas de la casa, kit de piezas, referencia,
  storyboard atado a la voz, sonido y el bucle de crítica por fotogramas.
- **Mostrar, no decir.** Cada frase de la voz tiene una IMAGEN que la prueba: la app o el objeto
  armándose, la carrera, el envío que falla, el precio que cae, el antes y el después. El texto en
  pantalla es apoyo, no protagonista.
- **Los grandes no cortan rápido: cambian rápido.** Algo nuevo cada 45–90 frames (1,5–3 s), nunca más
  de 90 frames quieto. Morph antes que corte: el mismo contenedor crece, se parte o se transforma; el
  corte duro se reserva para los remates.

## 2. Flujo (8 pasos)
1. **Guion aprobado + voz** (`GUION.md`; una sola toma, tiempos por palabra). La voz manda el tiempo.
2. **Brief por bloques** (`src/v2/<NNN>/BRIEF.md`, ver `DIRIGIR.md`): ROLE · STORY · lienzo y zonas ·
   STYLE GUIDE · BANNED · TECHNICAL · escenas con la palabra exacta (segundo del audio) de cada momento.
3. **Storyboard antes de código**: por escena, qué se ve, qué se mueve, en qué palabra, qué suena.
4. **Kit compartido** (`src/v2/kit.tsx`): paleta, curvas, `entra/sale/pop/contar/tecleo/deriva`,
   `Fondo`, `Grano`, `Logo`, `Chip`, `Tarjeta`, `Kicker`, `Cursor`, `rutaCursor`. Piezas grandes en
   `src/visual/` (Telefono, AppSeArma, Constructor, Juego, Carrera, TablaRevela, Movimiento).
5. **Escenas en paralelo, una o varias por agente** (`CONSTRUIR.md`): archivo propio + prueba propia
   `prueba-S<N>.tsx`; cada escena exporta su lista de SFX en frames relativos.
6. **Bucle de crítica por escena**: fotos de cada momento clave (`scripts/fotos.mjs`) → puntaje 1–10
   en gancho/claridad, legibilidad a 360 px, calidad de movimiento, variedad, composición/profundidad,
   pulido → arreglar los 3 peores → repetir hasta 8+ en todo.
7. **Ensamble** (`src/v2/Ensamble.tsx`, índice generado con `scripts/indice-v2.mjs <NNN>`): pre-roll
   congelado con el gancho completo, escenas con transición zoom + desenfoque de 8 f, fondo que cambia
   de color por acto, subtítulos de 1–4 palabras, voz, música −20 dB bajo la voz, SFX −14/−20 dB,
   whoosh en cada cruce. Render final: `node scripts/render-v2.mjs <NNN>` → `salidas/<id>.mp4`.
8. **Crítica del corte completo** (hoja de contacto de 1 frame por segundo + revisión de ritmo); solo
   entonces se da por terminado.

## 3. Lienzo
1080×1920, 30 fps. Zona útil x 70–950, y 240–1240. Subtítulos y 1300–1450. Abajo y a la derecha va la
interfaz de Reels/TikTok/Shorts. Nada en las esquinas.

## 4. Paleta por defecto: «Noche» (la del kit, paleta `N`)
Fondo #0B0B0F · tarjeta #14141B/#1C1C26 · línea #26262F · texto #F5F5F7 / #9A9AA8 · dato clave
#FFD166 · error #FF5C5C · ok #4ADE80 · acentos de concepto (los define cada brief). Grano 5 %,
viñeta, dos glows que derivan y **cambian de color por acto** (transición 18 f).
**Un color fijo por concepto todo el video** (concepto A, concepto B, dato clave amarillo, error rojo),
fijado en el STYLE GUIDE del brief. Lo que se muestra como producto (una app, una web, un objeto)
lleva su propio diseño y color.
Otra paleta es válida si el tema o el viral calcado la pide (ver `CALCAR.md`, kit propio por reel).
Tipos: Inter Tight 800–900 con tracking negativo (titulares 110–150 px, cifra estrella 180–240 px),
JetBrains Mono para código, relojes y kickers (28 px, +6). Nunca texto < 34 px.

## 5. Movimiento
- Una sola curva `cubic-bezier(0.16,1,0.3,1)`; `easeInOut` solo para recorridos de cursor.
- Entrada cara: opacidad + 26 px arriba + desenfoque 10→0 en 11 f. Salida más corta (6–9 f).
- Escalonado entre hermanos 7–14 f. Sellos con `pop` (overshoot 6 % máx.), nunca rebotes de plantilla.
- Cámara viva: push-in 1,00→1,05 por escena o `deriva` (cámara en mano determinista).
- Texto que se escribe en vivo (~30 caracteres/s) y resultado que entra de golpe (1,08→1 en 10 f).
- Contadores de 20–30 f hasta una cifra de 180–220 px. Barras que crecen en duelo.
- Diagramas que se arman al ritmo de la voz: nodo con pulso 6–8 f, conexión con cometa 10–12 f.
- Tachado a mano (path irregular con dashoffset, 10–14 f) y marcador amarillo que barre.
- Cursor con halo de clic guiando cada cambio de estado.

## 6. Técnicas que más enganchan (de los virales)
1. **Gancho completo en el cuadro 0** (titular + la imagen de la promesa); luego se rebobina y se
   cuenta. Spoiler tapado con desenfoque («¿cuál ganó?»).
2. **Carrera / duelo lado a lado** con relojes, barras y llegada con sello.
3. **Algo armándose pieza por pieza** dentro de una ventana o un teléfono (app, receta, presupuesto,
   plan), con esqueleto y shimmer.
4. **Un contenedor que nunca corta**: la caja se parte en dos, la tarjeta se vuelve tabla.
5. **Tabla que se destapa celda por celda** con recuadro amarillo en lo ganador.
6. **Lo que funciona vs. el error**: toast verde vs. toast rojo con sacudida.
7. **Diagrama de decisión vivo** (pregunta → cometa → respuesta).
8. **CTA como interfaz real**: la caja de comentario donde se teclea la palabra, el botón Seguir que
   se presiona, el ícono de guardar que se llena.

## 7. Sonido
Todo sintetizado en código (`scripts/sintetizar-sonido.mjs`, licencia limpia): click, pop, whoosh,
swish, impacto, tick, teclas, error, exito, sello, riser (en `public/sfx/`); música ~120 BPM con
quiebre en el giro del guion (la línea `MUSICA:` del brief). Un SFX por cada entrada, 2–3 f antes del
pico visual. Voz arriba; música ≈ −20 dB bajo la voz; SFX −14/−20 dB; mezcla final −14 LUFS
(`render-v2.mjs` la normaliza). Ojo con las librerías de SFX de terceros: revisa la licencia de cada
sonido antes de usarlo.

## 8. BANNED
Texto centrado sobre gradiente como único recurso · todo entrando con el mismo fade · rebotes de
plantilla · gradientes arcoíris · ráfagas de partículas genéricas · etiquetas o marcos en las
esquinas · glow en el cromo de la UI · emojis como íconos · `Math.random`, transiciones CSS,
`setTimeout` · logos oficiales de marcas · texto en pantalla en un idioma distinto al del guion ·
más de 3 niveles tipográficos a la vez · una pantalla quieta más de 3 s.

## 9. Recursos
Skills útiles de Claude Code para este trabajo: `remotion-best-practices`, `motion-graphics-video`,
`animate-text`, `motion-design`, `gsap-core` / `gsap-timeline` (para traducir specs a frames).
Bibliotecas MIT de recetas Remotion para copiar ideas: Remocn, snapcn, cinetic.
