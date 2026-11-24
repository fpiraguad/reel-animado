# Movimiento — kit de cámara, transiciones, íconos, sonido y destello

`src/visual/Movimiento.tsx`. Prueba: `src/visual/prueba-movimiento.tsx` (composición
`PruebaMovimiento`, 8 s, 4 escenas, con efectos) → `out/visual/movimiento/prueba.mp4`.

Todos los frames son **relativos a la escena** (la `<Sequence>` que los contiene), así que
se atan a la voz con `enPalabra(palabras, 'listo', 30)`.

## Camara
Envuelve el contenido de una escena y le da movimiento continuo.

| prop | tipo | defecto | |
|---|---|---|---|
| `tipo` | `'zoom' \| 'paneo' \| 'empuje' \| 'deriva'` | `'zoom'` | zoom lento 1→1.07 · paneo lateral · empuje decidido hacia `foco` (lo lleva al centro) · deriva de cámara en mano |
| `desde` / `hasta` | frames | 0 / fin de la secuencia | |
| `escalaDesde` / `escalaHasta` | número | según tipo (empuje 1→1.3) | |
| `foco` | `[x, y]` px | `[540, 740]` | |
| `paneo` | `[dx, dy]` px | `[-70, 0]` | |
| `centrar` | bool | true | empuje: además de escalar, centra el foco |
| `vida` | número | 1 | deriva mínima siempre encendida (0 = quieta) |

## Transicion
Reemplaza a `<Salida>` en `Reel.tsx`. Cada escena hace su mitad: la salida en sus últimos
`n` frames y la entrada en sus primeros `n`. Dos escenas seguidas con la misma `salida`/`entrada`
forman una transición continua a través del corte, sin solapar secuencias.

| prop | tipo | |
|---|---|---|
| `frames` | número | duración de la escena (la de su `<Sequence>`) |
| `entrada` | `'barrido' \| 'zoom' \| 'deslizar' \| 'fundido' \| null` | igual a la `salida` de la escena anterior |
| `salida` | ídem | null en la última |
| `n` | frames por mitad | por defecto `FRAMES_TRANSICION` (12/12/11/6) |
| `sonido` | bool, true | whoosh (o swish en deslizar) pegado al corte; solo lo pone la salida |

Uso en el motor (sin tocar el resto):
```tsx
const t = (i: number) => reel.escenas[i]?.transicion ?? 'barrido'
<Transicion frames={frames} entrada={i ? t(i - 1) : null} salida={i < n - 1 ? t(i) : null}>
  <Visual … />
</Transicion>
```
La franja del barrido se pinta dentro de la escena: si los subtítulos van como hermanos
encima, quedan negros sobre negro 2–3 frames; si se quiere, se meten dentro de `Transicion`.

## IconosFlotantes
3–6 íconos de lucide (`'shopping-cart'`, `'ShoppingCart'`…) que entran con pop (spring con
rebote, desde el centro y girando) y flotan alrededor de un elemento.

`iconos` (string o `{nombre, color}`), `color` (id de herramienta, hex o `'negro'`, por
defecto negro), `centro [x,y]`, `radio` (número o `[rx, ry]`, 340), `tam` (132), `desde`,
`paso` (5 frames entre íconos), `angulo` (-120°), `sonido` (pop por ícono, true).

## Sfx
`<Sfx tipo="whoosh" | "swish" | "pop" | "click" | "ding" frame={n} volumen?={0..1} />`
Sale de `@remotion/sfx` (se descarga de remotion.media al renderizar: hace falta red).
Picos entre −14 y −20 dB con los volúmenes por defecto (`SFX`); la voz pica a ≈0 dB.
`pop` = switch subido de tono; `recorte` quita el silencio inicial para que caiga en `frame`.

## Destello
Momento «listo»: luz champán casi blanca que entra por una esquina y se va, reflejo que
cruza el elemento listo, aro fino que sale de él y «ding».

`desde`, `dur` (42), `intensidad` (0.6), `caja {x,y,w,h,radio}`, `esquina`
(`'arriba-derecha'`…), `sonido` (true), `motor` (`'css'` por defecto; `'webgl'` usa
`<LightLeak>` de `@remotion/light-leaks` y **exige** renderizar con `--gl=angle` o
`Config.setChromiumOpenGlRenderer('angle')`; sin eso el render se cae en ese frame), `seed`.

## Ejemplo en un guion JSON (propuesta de campos para el motor)
```json
{
  "id": "e3",
  "transicion": "zoom",
  "camara": { "tipo": "empuje", "foco": [540, 760], "desdePalabra": "mira" },
  "iconos": { "lista": ["shopping-cart", "credit-card", { "nombre": "sparkles", "color": "#F97316" }], "desdePalabra": "tienda" },
  "sfx": [{ "tipo": "click", "palabra": "publicar" }],
  "destello": { "palabra": "listo", "caja": { "x": 240, "y": 700, "w": 600, "h": 150 } },
  "visual": { "tipo": "titular", "texto": "…" }
}
```
