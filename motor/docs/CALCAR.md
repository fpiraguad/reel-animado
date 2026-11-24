# CALCAR.md — encargo común: calcar 1:1 un video viral a otro idioma

Calcar = misma estructura, mismo ritmo, mismos planos, mismo tipo de pieza (reel o carrusel), con el
texto traducido y adaptado al idioma de destino (por defecto, español neutro). No es «inspirarse»:
frase por frase y plano por plano. Siempre se da crédito al original en la `fuente` del guion.

Rutas relativas a la raíz del motor. Modelo de cómo queda un guion y un brief: `guiones/001-demo.json`
y `src/v2/001/BRIEF.md`. Formato del guion: `docs/GUION.md`.

## Tu trabajo, por cada candidato (SOLO esta fase: análisis + guion + voz + brief)
1. **Bajar y mirar** en `tmp/calco/<shortcode>/`:
   `yt-dlp -o "ref.%(ext)s" "<url>"` (`yt-dlp -J` dice si es video o varias imágenes; si es carrusel
   baja las imágenes). Video: `ffmpeg -threads 2` a 2 fps, hojas de contacto `tile=8x4` a 216 px y
   MÍRALAS TODAS. Transcribe con whisper.cpp:
   `ffmpeg -i ref.mp4 -ar 16000 -ac 1 a.wav` y
   `whisper-cli -t 4 -m <modelo ggml, p. ej. ggml-small-q5_1.bin> -f a.wav -l <en|pt|…> -ojf -of t`.
   Carrusel: mira cada imagen. Lee la descripción (`yt-dlp --print description "<url>"`).
2. **Descarta** si: ya está en el idioma de destino; no es del tema que buscas; es pura cara hablando
   sin nada visual que calcar Y sin un texto fuerte; o depende de un dato que no se puede verificar.
   Si descartas, dilo en una línea y por qué.
3. **Verifica cada dato** (precios, cifras, nombres de productos, fechas) en la fuente original con
   búsqueda web. Lo que no se pueda confirmar se quita o se dice sin cifra. Nada inventado.
4. **Guion** `guiones/<ID>-<slug>.json` con `fuente{url, medio, fecha, likes, ganchoOriginal}` y, si
   quieres, `verificado` (qué datos confirmaste y dónde). La voz calca frase por frase el original,
   con etiquetas de emoción suaves; el gancho igual de fuerte desde el segundo 0. El CTA final es el
   equivalente del original, traducido (si el original dice «comment X», usa esa palabra traducida);
   si no trae CTA, pon uno claro (ver reglas en `GUION.md`). Caption: 3–5 líneas + pregunta; 3–5 hashtags.
5. **Recurso** (si el CTA promete algo, p. ej. «te mando la guía»): escríbelo completo y útil en
   `recursos/<ID>-<slug>.md`. Lo prometido tiene que existir.
6. **Voz**: `node scripts/voz.mjs guiones/<ID>-<slug>.json` (si ElevenLabs da 429, espera 30 s y
   reintenta). Verifica con whisper (`-l <idioma destino>`) que diga bien los nombres; si uno suena
   mal, agrégalo a `voz.pronunciar` y regenera.
7. **Si es REEL**: escribe `src/v2/<ID3>/BRIEF.md` como el de ejemplo: ROLE, STORY con los datos
   verificados, lienzo, STYLE GUIDE que calca el look del original (colores hex, tipografías de
   Google Fonts parecidas, layout, cómo se mueve), BANNED, TECHNICAL, y escenas con t0/t1 y
   palabra@segundo exacto de `public/voz/<ID>-<slug>/narracion.json`, cortes en silencios; la última
   termina en el fin de la última palabra + 1,5 s. Donde el original muestra personas, nosotros
   ponemos animación o imágenes generadas.
   Si el estilo no es la paleta oscura del kit, escribe también un kit propio
   `src/v2/<ID3>/estilo-kit.tsx` (tokens, fondo, tipos, piezas comunes) y
   `src/v2/<ID3>/estilo.json`, que `scripts/indice-v2.mjs` pega tal cual en el índice del reel:
   `importar` (línea de import de tu kit) y `config` (opciones del ensamble como texto TS), p. ej.
   `{ "importar": "import { C } from './estilo-kit'", "config": "  fondo: 'propio',\n  base: C.papel,\n  subtitulos: 'oscuros'," }`.
   `subtitulos` y `colorPalabra` también pueden ser funciones (por segundo o por palabra).
   Si hacen falta imágenes (mascotas, objetos, fotos), genéralas con `node scripts/imagen.mjs <lote.json>`
   (`[{ "salida": "public/ia/<ID3>/x.png", "prompt": "…", "size": "1024x1024" }]`). Para recortes sin
   fondo, genera sobre un croma liso y quítalo con `ffmpeg … colorkey`.
   Al final del brief: `MUSICA: duracion=<s> quiebre=<s>`.
   **Si es CARRUSEL**: escribe `src/v2/<ID3>/CARRUSEL.md`: número de láminas (1080×1350), qué va en
   cada una (texto exacto, jerarquía, imágenes), estilo calcado del original y la última lámina con
   el CTA. Sin voz: sáltate el paso 6.
8. No construyas escenas ni renderices (eso es la fase siguiente, `CONSTRUIR.md`). No toques archivos
   de otros IDs. Sin navegadores ni servidores. Borra mp4, wav y jpg de `tmp/` al terminar.

## Qué devolver (≤ 6 líneas por candidato)
ID, tipo (reel / carrusel / descartado y por qué), duración de la voz, CTA, datos que verificaste o
quitaste, y la ruta del brief o del CARRUSEL.md.
