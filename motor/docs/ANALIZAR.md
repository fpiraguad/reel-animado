# ANALIZAR.md — encargo común: destripar la parte VISUAL de un video viral

No solo importa el copy: importa cómo se ve y cómo se mueve. Tu trabajo es analizar cuadro a cuadro
un video de referencia para recrearlo con motion graphics en Remotion (sin personas: donde el
original muestra a alguien hablando a cámara, nosotros ponemos animación o la pantalla a tamaño
completo). El análisis lo usan después `DIRIGIR.md` y `CALCAR.md`.

Rutas relativas a la raíz del motor. Carpeta de trabajo: `tmp/visual/<id>/` (nueva, vacía).

## Cómo
1. **Bajar el video**:
   `yt-dlp -f "bv*[height<=720]+ba/b" --merge-output-format mp4 -o ref.mp4 "<url>"`
   (si es largo, analiza los primeros 90 s y los 20 s del final).
2. **Fotogramas y ritmo**:
   - `ffmpeg -threads 2 -i ref.mp4 -vf "fps=1,scale=360:-1" f_%03d.jpg`
   - hojas de contacto de 10 en 10: `ffmpeg -pattern_type glob -i 'f_0*.jpg' -vf tile=5x2 hoja_%02d.jpg`
   - cortes: `ffmpeg -i ref.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep pts_time`
   - MIRA todas las hojas del tramo analizado.
   - Si hace falta el texto: `ffmpeg -i ref.mp4 -ar 16000 -ac 1 a.wav` y
     `whisper-cli -t 4 -m <modelo ggml> -f a.wav -l <idioma> -ojf -of t` (tiempos por palabra).
3. **Escribe `docs/analisis/analisis-<id>.md`** con:
   - **Plano por plano**: tabla `t · qué se ve · qué se mueve · texto en pantalla`.
   - **Ritmo**: cortes por minuto, segundos promedio por plano, cuánto dura el gancho visual.
   - **Técnicas visuales que se repiten** (pantalla de la herramienta con chat + vista previa, zoom a
     un detalle, collage de resultados, cursor que hace clic, scroll dentro de una app, comparación
     lado a lado, contador o marcador, flechas y círculos que señalan, texto grande sobre la imagen,
     transiciones), cada una con tiempos de ejemplo.
   - **Paleta y tipografía** (colores hex aproximados, familias parecidas de Google Fonts, layout).
   - **Cómo recrearlo sin personas** con nuestro kit (`src/v2/kit.tsx`, `src/visual/*`): qué
     componente existe para cada técnica y cuál habría que construir.
   - **Los 3 momentos visuales más fuertes** y por qué enganchan.
4. Borra mp4, wav y jpg al terminar (deja solo tu .md). No abras navegadores ni servidores. No toques
   otros archivos del proyecto.

## Variante: extraer el MÉTODO de un tutorial de motion graphics
Si el video es un tutorial (cómo alguien hace motion graphics con IA + código), el foco cambia:
transcríbelo COMPLETO (`yt-dlp -f ba -x --audio-format mp3 -o audio.mp3 "<url>"` → wav → whisper con
`-otxt`), lee los enlaces de la descripción (`yt-dlp --skip-download --print description "<url>"`),
mira sobre todo los RESULTADOS y los prompts en pantalla, y escribe `docs/analisis/metodo-<id>.md`
con: el flujo paso a paso, los prompts textuales que usa y por qué funcionan, las técnicas visuales de
sus resultados, los errores y trucos que menciona, y 5–8 ideas concretas para aplicar a nuestros
reels. Lo que sirva para siempre se sube a `MOTION.md`.

## Qué devolver (≤ 8 líneas)
Segundos por plano, las 5 técnicas visuales clave con su tiempo de ejemplo y los 3 componentes que
más nos faltan para recrearlo.
