# GUION.md — el archivo `guiones/<id>.json`

El guion es la fuente de verdad del reel: la voz sale de él, el brief toma de él los datos que se
muestran en pantalla y nada que no esté aquí aparece en el video. Se genera la voz con:

```bash
node scripts/voz.mjs guiones/<id>.json          # voz real (ElevenLabs)
node scripts/voz-falsa.mjs guiones/<id>.json    # voz silenciosa de prueba, sin gastar créditos
```

Ambos dejan `public/voz/<id>/narracion.mp3` y `public/voz/<id>/narracion.json`
(`{ huella, modelo, palabras: [{ texto, inicio, fin }] }`, segundos desde el inicio del audio).

## Formato

```json
{
  "id": "001-demo",
  "titulo": "Lo que el reel promete, en una línea",
  "voz": {
    "modelo": "eleven_v4",
    "id": "<id de la voz en ElevenLabs>",
    "idioma": "es",
    "pronunciar": { "Notion": "Nóushon" }
  },
  "escenas": [
    { "id": "01-gancho", "voz": "[curious] Frase del gancho…", "visual": { "tipo": "titular", "kicker": "KICKER", "texto": "Titular con *énfasis*" } },
    { "id": "02-prueba", "voz": "[conversational] …", "visual": { "tipo": "titular", "kicker": "…", "texto": "…" } },
    { "id": "03-cta",    "voz": "[warm] …", "visual": { "tipo": "leccion", "kicker": "…", "texto": "…", "cta": "…" } }
  ],
  "caption": "Texto del post, 3–5 líneas y una pregunta al final.",
  "hashtags": ["#tema", "#subtema", "#nicho", "#formato"],
  "fuente": { "url": "https://…", "medio": "@cuenta (plataforma)", "fecha": "2026", "likes": 0, "ganchoOriginal": "…" }
}
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | `NNN-slug`. Los 3 dígitos `NNN` nombran la carpeta `src/v2/NNN/`. Es también la carpeta de la voz. |
| `titulo` | sí | Resumen interno del reel. |
| `voz.modelo` | sí | `eleven_v4` (recomendado) o `eleven_v3`: entienden etiquetas de emoción. Con cualquier otro modelo (p. ej. `eleven_multilingual_v2`) `voz.mjs` quita las etiquetas para que no las lea en voz alta. |
| `voz.id` | sí | La voz de ElevenLabs (una tuya clonada o una de la biblioteca). También se puede pasar `--voz <id>` en la línea de comandos. |
| `voz.idioma` | no | Código ISO (`es`, `pt`, `en`…). Fuerza el idioma de la pronunciación. |
| `voz.pronunciar` | no | `{ escrita: fonética }`. A ElevenLabs le llega la fonética; los subtítulos y `narracion.json` conservan la forma escrita. Úsalo para marcas y nombres que la voz dice mal. |
| `voz.ajustes` | no | `voice_settings` de ElevenLabs. En v3/v4 la estabilidad solo admite 0 / 0,5 / 1; un valor alto da un tono más parejo. |
| `escenas[].id` | sí | Nombre del tramo (`01-gancho`…). |
| `escenas[].voz` | sí | Lo que se dice en ese tramo, con etiquetas entre corchetes. Todas las frases se juntan en UNA sola toma para que la entonación fluya; luego se reparten por escenas con los tiempos de cada palabra. |
| `escenas[].visual` | sí | Pista para el brief (tipo, kicker, texto, cta). El brief manda sobre lo que se ve; esto solo fija el titular y el texto aprobado. `*palabra*` marca el énfasis. |
| `caption`, `hashtags` | sí | El texto del post y 3–5 hashtags. |
| `fuente` | no | Solo si es un calco o se basa en un video ajeno (ver `CALCAR.md`). Otros campos libres (p. ej. `verificado`: qué datos se confirmaron y dónde) se ignoran al generar la voz y sirven de registro. |

Detalles técnicos de `voz.mjs`:
- Caché por huella (texto + modelo + ajustes + voz + idioma): solo vuelve a llamar a ElevenLabs si
  algo de eso cambia.
- Cuenta las palabras del guion (sin etiquetas) y las de la toma: si no coinciden, falla con «revisar
  signos sueltos en la voz». Causa típica: un guion o un signo suelto separado por espacios.
  Escribe «—» y «…» pegados a una palabra.
- Cada escena arranca 0,12 s antes de su primera palabra; el audio tiene 0,8 s de cola al final.
- Si ElevenLabs responde 429, espera 30 s y reintenta.

## Reglas de oro

1. **El gancho promete el resultado y se ve completo en el cuadro 0.** La primera frase dice qué va a
   ganar quien mira (o la contradicción que lo engancha), y el titular de la escena 1 se lee entero
   en la portada, sin esperar a que se anime.
2. **≤ 90 s.** Ideal 30–60 s. Una idea por reel, un ángulo.
3. **Cifras verificadas o fuera.** Precios, fechas, porcentajes, nombres de productos: se confirman en
   la fuente original antes de escribirlos. Lo que no se pueda confirmar se dice sin cifra o se quita.
   Nada inventado: ni testimonios, ni cupos, ni resultados.
4. **CTA claro al final**, en una frase y con una sola acción: seguir la cuenta, guardar el reel,
   visitar un enlace, «Comenta PALABRA y te mando X»… El que el reel necesite; el brief lo convierte
   en interfaz real en la última escena.
5. **Frases cortas, dichas como se habla.** Cada frase debe poder ilustrarse con una imagen que la
   pruebe (ver `MOTION.md`, «Mostrar, no decir»).
6. **Escribe los números como se pronuncian** si la voz los lee mal («cuatro mil» en vez de «4.000»);
   en pantalla el brief puede mostrar la cifra.

## Etiquetas de emoción (ElevenLabs v3/v4)

Van en inglés, entre corchetes, al inicio de la frase o antes del giro. **Suaves**: las exageradas
(`[excited]`, `[shouting]`, `[laughs]`) suenan a anuncio; una o dos por escena basta.

| Etiqueta | Para |
|---|---|
| `[curious]` | gancho, pregunta, misterio |
| `[conversational]` | explicación, el cuerpo del reel |
| `[confident]` | resumen, veredicto, dato fuerte |
| `[thoughtful]` | giro, matiz, «pero…» |
| `[serious]` | advertencia, error común |
| `[warm]` / `[friendly]` | cierre y CTA |
| `[short pause]` | silencio breve antes del remate (también sirve como corte de escena) |

Las etiquetas no cuentan como palabras ni aparecen en los subtítulos.
