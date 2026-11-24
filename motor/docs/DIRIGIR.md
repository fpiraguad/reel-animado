# DIRIGIR.md — encargo común: escribir el brief de dirección de un reel

Formato del reel: una película oscura dirigida plano a plano, donde cada frase de la voz tiene una
imagen que la prueba. Tu trabajo es SOLO escribir el brief de dirección; otros agentes construyen las
escenas después a partir de él (ver `CONSTRUIR.md`).

Rutas relativas a la raíz del motor. Lee primero, completos:
- `src/v2/001/BRIEF.md`: el MODELO de formato y de nivel (ROLE, STORY, lienzo, STYLE GUIDE, BANNED,
  TECHNICAL, escenas con palabra@segundo). Copia lo común adaptándolo y reescribe ROLE, STORY y escenas.
- `docs/MOTION.md` y `src/v2/kit.tsx`.
- `guiones/<id>.json` (copy APROBADO: la voz no se toca; los datos en pantalla solo salen del guion;
  formato en `docs/GUION.md`) y `public/voz/<id>/narracion.json` (`palabras[{texto,inicio,fin}]`).
- El video de referencia, si lo hay: si existe `docs/analisis/analisis-<id>.md` (método en `docs/ANALIZAR.md`), léelo. Si no, bájalo
  en `tmp/visual/<id>/` con `yt-dlp -f "bv*[height<=720]+ba/b" --merge-output-format mp4 -o ref.mp4 "<url>"`
  (solo 0–90 s si es largo), saca fotogramas cada 2 s
  (`ffmpeg -threads 2 -i ref.mp4 -vf "fps=0.5,scale=360:-1" f_%03d.jpg`), arma hojas de contacto
  (`tile=5x4`) y MÍRALAS. Lo que el original MUESTRA es lo que nuestras escenas deben mostrar, en
  nuestra paleta. Borra mp4 y jpg al terminar. Si yt-dlp falla, sigue con el guion.
- Inspiración de lo que se puede construir: las escenas renderizadas del reel de ejemplo
  (`out/v2/001/S*/escena.mp4`; saca 2–3 fotogramas con `ffmpeg -threads 2` y míralos) y los
  componentes de `src/visual/` (Telefono 3D, AppSeArma, Constructor de apps, Juego, Carrera,
  TablaRevela, Movimiento) con sus `.md`.

## Qué escribes: `src/v2/<NNN>/BRIEF.md` (NNN = los 3 dígitos del id)

- **6 a 9 escenas sin huecos** (3–4 si el reel dura menos de 25 s): la primera en t0 0,00; la última
  termina en el fin de la última palabra + 1,5 s; los cortes caen en los silencios entre frases.
- **Encabezado por escena, con este formato exacto** (lo lee `scripts/indice-v2.mjs`):
  ``### S1 · Gancho — t0 0,00 · t1 7,00 (210 f) · `S1Gancho.tsx` ``
  (id `S<N>`, archivo `S<N><Nombre>.tsx`, t0, t1, frames a 30 fps).
- **Por escena**: la voz con palabra@segundo exacto (de `narracion.json`) y el storyboard: qué se VE
  (apps o interfaces creíbles, teléfonos, terminales, juegos, diagramas vivos, morphs), qué se mueve
  en qué palabra, y los SFX (tipos de `src/v2/sonido.ts`: click, pop, whoosh, swish, impacto, tick,
  teclas, error, exito, sello, riser).
- **Algo nuevo cada 1,5–3 s**; nada de «texto sobre fondo» como recurso principal. Si el guion lista
  varias cosas (herramientas, pasos, productos), cada una con su propio momento visual distinto.
- **Escena 1 con `portada`**: el gancho COMPLETO y legible en el cuadro 0; el titular sigue visible
  después (no desaparece ni vuelve a entrar).
- **Última escena: el CTA tal cual lo dice el guion**, convertido en interfaz real y quieto y legible
  el último 1,5 s. Patrones posibles según el CTA:
  - «Comenta PALABRA y te mando X» → caja de comentario donde se teclea la palabra + el mensaje
    privado que llega con el recurso.
  - «Sígueme para…» → perfil con el botón Seguir que se presiona.
  - «Guárdalo» → el ícono de guardar que se llena y el reel entrando a la colección.
  - «Enlace en el perfil / visita X» → el perfil con el enlace resaltado y el cursor que lo toca.
- **Un color fijo por concepto**, todo el video, definido en el brief (en STYLE GUIDE) como una tabla.
  Ejemplo para un reel que compara dos métodos de estudio:
  `Método A #7C9CFF · Método B #F2A65A · dato clave #FFD166 · error #FF5C5C · ok #4ADE80`.
  Si aparecen marcas o productos reales, usa un tono parecido al suyo, pero con glifos propios:
  nunca logos oficiales.
- **Al final**, una línea `MUSICA: duracion=<s> quiebre=<s>` (quiebre = inicio del giro del guion);
  de ahí sale la pista sintetizada (`scripts/sintetizar-sonido.mjs musica <NNN>` y `MUSICA[NNN]` en
  `src/v2/sonido.ts`).

No escribas código ni toques otros archivos. Sin navegadores ni servidores.
Devuelve (≤ 5 líneas): ruta del brief, escenas con t0–t1 y la línea MUSICA.
