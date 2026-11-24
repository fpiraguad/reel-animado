---
name: reel-animado
description: Produce reels verticales animados (1080×1920, sin cara) con Remotion, de punta a punta — guion, voz con timestamps (ElevenLabs), brief de dirección plano a plano, escenas construidas por agentes en paralelo, música sintetizada, ensamble, render y revisión cuadro a cuadro. También calca un video viral de otro idioma 1:1 al tuyo. Sirve para cualquier tema (explicativos, tutoriales, producto, educación). Usar cuando digan /reel-animado, "hazme un reel", "hazme un video animado", "video explicativo", "calca este reel", "pásalo a español", o pasen un link de Reel/Short/TikTok para modelarlo.
---

# Reel animado — de un guion a un mp4 listo para publicar

El motor es un proyecto de Remotion (React 19 + TypeScript) que vive en la carpeta `motor/` del
repo de este skill. **MOTOR** = esa carpeta. Por defecto `~/reel-animado/motor`; si no está ahí,
búscala (`find ~ -maxdepth 4 -name remotion.config.ts -path "*reel-animado*"`) o pregunta.

Guías del motor (léelas cuando toque, no antes):

| Archivo | Cuándo |
|---|---|
| `MOTOR/docs/GUION.md` | Escribir el guion `guiones/<id>.json` |
| `MOTOR/docs/DIRIGIR.md` | Escribir el brief de dirección (lo hace un agente o tú) |
| `MOTOR/docs/CONSTRUIR.md` | El encargo que recibe cada agente que construye escenas |
| `MOTOR/docs/CALCAR.md` | Calcar un viral 1:1 a otro idioma |
| `MOTOR/docs/MOTION.md` | Gramática visual: ritmo, curvas, composición |
| `MOTOR/src/v2/001/` | Reel de ejemplo completo: la vara de calidad y de formato |

## Requisitos (comprobar la primera vez)

- Node 20+, `pnpm` y `ffmpeg` en el PATH. `cd MOTOR && pnpm install`.
- `MOTOR/.env` (copiar de `.env.example`): `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID` para la
  voz; `OPENAI_API_KEY` solo si se van a generar imágenes. Sin llaves se puede probar todo con la
  voz silenciosa (`pnpm voz-prueba`).
- Opcional: `yt-dlp` y `whisper-cli` (whisper.cpp) para bajar y transcribir virales.

## Reglas de oro

- **Gancho**: la primera frase promete el resultado y se ve COMPLETA en el cuadro 0 (es la
  miniatura). El titular no desaparece después.
- **Veracidad**: toda cifra, precio o fecha se verifica en la fuente oficial. Lo que no se
  confirma se quita, no se adivina.
- **Duración**: hasta 90 s. Si sobra, se condensa la voz; nunca se corta el gancho.
- **Algo nuevo en pantalla cada 1,5–3 s.** Nada de «texto sobre fondo» como recurso principal:
  interfaces creíbles, teléfonos, diagramas vivos, contadores, morphs.
- **Sin logos oficiales ni personajes ajenos**: glifos propios en SVG. Si el original muestra
  personas, va animación o una imagen generada.
- **CTA claro al final**, quieto y legible el último 1,5 s.
- **Todo es función del frame** (nada de `Math.random`, transiciones CSS ni `setTimeout`).

## Flujo (IDs `NNN-tema`, p. ej. `002-presupuesto`)

1. **Guion** → `MOTOR/guiones/NNN-tema.json` siguiendo `docs/GUION.md`. Si es un calco, primero
   `docs/CALCAR.md` (bajar el original, hojas de cuadros, transcripción, traducción fiel).
2. **Voz** → `pnpm voz guiones/NNN-tema.json` (una sola toma con tiempos por palabra en
   `public/voz/<id>/narracion.{mp3,json}`). Se cachea: solo vuelve a cobrar si cambia el texto.
   Verificar nombres propios y cifras escuchando o con whisper. Sin llave: `pnpm voz-prueba …`.
3. **Brief** → `MOTOR/src/v2/NNN/BRIEF.md` con el formato de `src/v2/001/BRIEF.md` y
   `docs/DIRIGIR.md`: 6–9 escenas sin huecos, cada momento en palabra@segundo, SFX por escena y al
   final `MUSICA: duracion=<s> quiebre=<s>`. El encabezado de cada escena lleva el formato exacto
   que lee `indice-v2.mjs`: ``### S1 · Gancho — t0 0,00 · t1 7,00 (210 f) · `S1Gancho.tsx` ``.
4. **Escenas en paralelo** → un agente por cada 2–3 escenas consecutivas, todos lanzados a la vez,
   con el prompt: «Lee y sigue docs/CONSTRUIR.md. Reel: NNN. Tus escenas: S1, S2 y S3». Cada
   agente escribe solo sus archivos y se autocritica con fotos hasta 8/10. Lo que se repite entre
   escenas (un teléfono, una insignia) se fija en el brief con posiciones exactas para que empalme.
5. **Música** → agregar `{duracion, quiebre}` del reel en `scripts/sintetizar-sonido.mjs` y
   `pnpm musica NNN`. Registrar la pista en `MUSICA` de `src/v2/sonido.ts`. Los SFX ya están en
   `public/sfx/` (click, pop, whoosh, swish, impacto, tick, teclas, error, exito, sello, riser).
6. **Ensamble** → `pnpm indice NNN` (arma `src/v2/NNN/index.tsx`: pre-roll, transiciones,
   subtítulos de 1–4 palabras, voz, música y SFX) y `pnpm lint`.
7. **Render** → `pnpm render NNN` → `salidas/<id>.mp4` + portada (bt709 rango limitado, −14 LUFS).
   Todo render pasa por `scripts/cola.mjs`, que reparte los núcleos entre renders simultáneos.
8. **Revisar antes de entregar**: hoja de contacto a 1 fps
   `ffmpeg -threads 4 -i salidas/<id>.mp4 -vf "fps=1,scale=216:-1,tile=9x5" -frames:v 2 tmp/hoja-%d.png`
   y MIRARLA: texto que pisa los subtítulos (y 1300–1450), cosas fuera de x 70–950, cuadros vacíos
   de más de 1 s, cifras que no están en el guion, empalmes raros entre escenas de agentes distintos.
   Volumen: `ffmpeg -i salidas/<id>.mp4 -af ebur128 -f null - 2>&1 | grep -A3 Summary`.

Para revisar una escena suelta sin renderizar todo:
`node scripts/fotos.mjs src/v2/NNN/prueba-S2.tsx PNNNS2 out/NNN/S2 0,40,95 --hoja`
(empaqueta una vez y abre un solo Chrome; mucho más rápido que `npx remotion still`).

## Videos para una marca

Mismo flujo, con un kit de marca propio en `src/v2/NNN/estilo-kit.tsx` (colores, fuentes de
`@remotion/google-fonts`, logo con transparencia en `public/marcas/<marca>/`, piezas de su UI) y un
`src/v2/NNN/estilo.json` así:
`{ "importar": "import { FondoMarca } from './estilo-kit'", "config": "fondo: 'propio', subtitulos: 'claros', colorPalabra: '#…'," }`
(`indice-v2.mjs` pega esas dos cadenas tal cual en el `index.tsx`; ver `docs/CALCAR.md`). El brief dice arriba «este BRIEF manda sobre CONSTRUIR.md» y
prohíbe cifras o funciones que el producto no tenga hoy. Si la voz pronuncia mal la marca:
`"voz": { "pronunciar": { "Marca": "fonética" } }` en el guion.

## Trucos aprendidos

- ElevenLabs acepta pocas llamadas simultáneas: lotes de máx. 4.
- Generadores de imagen sin fondo transparente: generar sobre croma liso (#00FF00, o #0000FF si el
  objeto es verde) y quitarlo con
  `ffmpeg -i x.png -vf "colorkey=0x00FF00:0.32:0.08,despill=type=green,format=rgba" x-sin-fondo.png`.
- Exportar con rango limitado bt709: Instagram lava el rango completo.
- Subtítulos sobre fondos claros: en `src/v2/NNN/estilo.json`,
  `{ "config": "subtitulosCaja: true," }` (la cadena `config` se pega tal cual en el índice).
- `LightLeak` y otros efectos WebGL: `pnpm render NNN --gl angle`.
- Más de 8 núcleos en un solo render suele ir MÁS lento; varios renders a la vez rinden más
  repartiendo núcleos (eso hace `cola.mjs`).
