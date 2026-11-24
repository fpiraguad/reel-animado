# CONSTRUIR.md — encargo común: construir escenas de un reel

Construyes VARIAS escenas consecutivas de un reel (una película dirigida plano a plano), siguiendo su
brief al pie de la letra y con calidad de canal grande. El reel de ejemplo es la vara: mira
`out/v2/001/S*/escena.mp4` (saca 2–3 fotogramas con `ffmpeg -threads 2` y míralos) y lee 1–2 de sus
escenas en `src/v2/001/` para ver cómo se escribe aquí.

Motor: Remotion 4, React 19, TypeScript. Rutas relativas a la raíz del motor.

## Lee antes de escribir
1. `src/v2/<NNN>/BRIEF.md` COMPLETO (dirección, style guide, banned, tiempos por palabra de TUS
   escenas y de las vecinas, para que los bordes empalmen).
2. `src/v2/kit.tsx` (paleta `N`, curvas, `entra/sale/pop/contar/tecleo/deriva`, `Fondo`, `Logo`,
   `Chip`, `Tarjeta`, `Kicker`, `Cursor`, `rutaCursor`…) y `src/v2/sonido.ts` (`TipoSonido`).
3. `docs/MOTION.md`. Si el brief pide teléfonos, constructores de apps, juegos, carreras o tablas,
   mira también el componente de `src/visual/` que corresponde y su `.md`.

## Contrato
- Cada escena en `src/v2/<NNN>/S<N><Nombre>.tsx` (el nombre que dice el brief):
  `export const S<N><Nombre>: React.FC<{ portada?: boolean }>`, dibujada desde su frame 0 = segundo
  `t0` del audio, y `export const SFX_S<N>: { f: number; tipo: TipoSonido; vol?: number }[]`
  (frames relativos a la escena; `import type { TipoSonido } from '../sonido'`). Sin `<Audio>`: el
  ensamble (`src/v2/Ensamble.tsx`) pone voz, música y SFX.
- La escena NO pinta fondo (es transparente), salvo que el brief diga que tiene fondo propio.
- S1 con `portada`: el gancho COMPLETO y legible (lo que se ve en el cuadro 0 y en la miniatura), y el
  titular sigue visible después del cuadro 0 (no desaparece ni vuelve a entrar).
- Si una escena «arranca en el último estado» de la anterior y esa la hace otro agente, recrea ese
  estado dentro de tu archivo según el brief (no importes archivos de otros agentes).
- Glifos que el kit no trae: créalos en tu archivo (SVG propio, nunca logo oficial).
- Prueba por escena: `src/v2/<NNN>/prueba-S<N>.tsx` con `registerRoot` y composición `P<NNN>S<N>`
  (1080×1920, 30 fps, la duración exacta en frames del brief) que pinte `<Fondo/>` + tu escena.
- Todo es función del frame: nada de `Math.random`, transiciones CSS ni `setTimeout`. Texto ≥ 34 px
  salvo decoración. Zona útil x 70–950, y 240–1240 (subtítulos en y 1300–1450). El idioma en
  pantalla es el del guion.
- Solo escribes TUS archivos. NO toques `kit.tsx`, `sonido.ts`, `Ensamble.tsx`, `BRIEF.md`, el Root,
  `src/visual/`, `src/v2/001/` ni escenas de otros agentes. Sin navegadores, Studio ni servidores.

## Verificación (bucle de crítica, obligatorio): `scripts/fotos.mjs`, no `npx remotion still`
`npx tsc --noEmit` (tus archivos sin errores). Para revisar una escena, UNA sola llamada saca todas
las fotos (empaqueta una vez y abre un solo Chrome; ≈ 1 s por foto en vez de ≈ 13 s):

```bash
node scripts/fotos.mjs src/v2/<NNN>/prueba-S<N>.tsx P<NNN>S<N> out/v2/<NNN>/S<N> 0,40,95,150,217 --hoja
# o cada=30 en vez de la lista de frames
```

MIRA `out/v2/<NNN>/S<N>/hoja.png` y las fotos clave. Puntúa 1–10: gancho/claridad, legibilidad a
360 px, movimiento, variedad, composición/profundidad, pulido. Arregla los 3 peores y repite hasta 8+
en todo (máx. 4 rondas). Al final saca el mp4 de la escena con la misma herramienta, agregando
`--mp4 --nucleos 4`. Todos los renders pasan por la cola compartida de núcleos (`scripts/cola.mjs`):
si está llena, la herramienta espera su turno sola. No uses `npx remotion render` directo.

## Qué devolver (≤ 6 líneas)
Archivos, puntajes de la última ronda por escena, y cualquier limitación o desvío del brief.
