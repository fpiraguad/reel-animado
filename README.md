# reel-animado

Un skill para Claude Code que produce **reels verticales animados** (1080×1920, sin cara) de
cualquier tema: guion → voz → dirección plano a plano → escenas hechas por agentes en paralelo →
música → render → revisión. Incluye el motor de Remotion con el que se hacen y un reel de ejemplo.

```
skill/reel-animado/SKILL.md   ← el skill (lo que lee Claude)
motor/                        ← proyecto Remotion (React 19 + TypeScript)
  docs/                       ← guías: GUION, DIRIGIR, CONSTRUIR, CALCAR, MOTION
  src/v2/kit.tsx              ← paleta, curvas, entradas/salidas, piezas base
  src/v2/Ensamble.tsx         ← une escenas, voz, subtítulos, música y SFX
  src/visual/                 ← componentes listos (teléfono 3D, app que se arma, tablas…)
  src/v2/001/                 ← reel de ejemplo completo
  scripts/                    ← voz, música, ensamble, render, fotos de revisión
  public/sfx/                 ← efectos de sonido de licencia libre
```

## Instalación (5 minutos)

Necesitas [Claude Code](https://claude.com/claude-code), Node 20+, `pnpm` y `ffmpeg`
(en Mac: `brew install node pnpm ffmpeg`).

```bash
git clone https://github.com/fpiraguad/reel-animado.git ~/reel-animado
```

```bash
mkdir -p ~/.claude/skills && cp -R ~/reel-animado/skill/reel-animado ~/.claude/skills/
```

```bash
cd ~/reel-animado/motor && pnpm install && cp .env.example .env
```

Abre `motor/.env` y pon tu llave de [ElevenLabs](https://elevenlabs.io) (`ELEVENLABS_API_KEY`) y
el ID de la voz que quieras usar (`ELEVENLABS_VOICE_ID`: una de su biblioteca o tu voz clonada).
`OPENAI_API_KEY` es opcional, solo para generar imágenes.

## Pruébalo sin gastar nada

El ejemplo trae una voz silenciosa de prueba, así ves que todo funciona antes de poner llaves:

```bash
cd ~/reel-animado/motor && pnpm voz-prueba guiones/001-demo.json && pnpm musica 001 && pnpm indice 001 && pnpm render 001
```

El video queda en `motor/salidas/`.

## Úsalo

Abre Claude Code en la carpeta `~/reel-animado/motor` y pídele, por ejemplo:

- `/reel-animado hazme un reel de 40 s explicando cómo funciona el interés compuesto`
- `/reel-animado calca este reel a español: <link de Instagram, TikTok o YouTube Shorts>`
- `/reel-animado video promocional de mi marca <nombre>, colores #… y logo en public/marcas/…`

Claude escribe el guion, genera la voz, arma el brief, lanza agentes que construyen las escenas,
sintetiza la música, ensambla, renderiza y revisa el video cuadro a cuadro antes de entregártelo.

## Licencia

MIT. Los efectos de `public/sfx/` y la música los genera el propio sintetizador del repo.
