# Juego

Mini juegos de pixel art que se juegan solos, deterministas por frame, para meter dentro
de un celular o una ventana. Archivo: `src/visual/Juego.tsx`. Prueba: `src/visual/prueba-juego.tsx`
(composición `PruebaJuego`, 10 s: saltador generándose → serpiente → ladrillos).

## Props

| prop | tipo | por defecto | qué hace |
|---|---|---|---|
| `tipo` | `'saltador' \| 'serpiente' \| 'ladrillos'` | — | El juego. Saltador = cuadrado que salta cactus y come monedas (tipo dinosaurio de Chrome); serpiente = snake que persigue la comida y crece; ladrillos = breakout que entra por un túnel y rompe ~10 ladrillos en 3 s. |
| `desde` | frame | `0` | Frame en que arranca (o empieza a generarse, si `generar`). Atarlo a la palabra de la voz. |
| `ancho` / `alto` | px | `640` / `960` | Tamaño de la pantalla. El juego se dibuja en una retícula de 64 «pixeles» de ancho (44 en el saltador, pixeles más grandes) y se escala. |
| `paleta` | `{ fondo, fondo2, hud, colores[] }` parcial | una por juego | Colores del juego. `colores`: saltador `[personaje, cactus, moneda, tierra, nube, pasto]`; serpiente `[cabeza, cuerpo, comida, borde]`; ladrillos `[bola, paleta, …filas]`. |
| `generar` | boolean | `false` | Antes de jugar, el juego aparece por capas: fondo en bloques → escenario con línea de escaneo → personaje con parpadeo → HUD, con la etiqueta «generando fondo/escenario/personaje/HUD NN%». |
| `durGenerar` | frames | `30` | Duración de la generación (cada capa ocupa un cuarto). El juego arranca en `desde + durGenerar`. |
| `nivel` | número | `1` | Lo que dice la placa «NIVEL N» del HUD. |
| `estilo` | CSSProperties | — | Estilo del contenedor (p. ej. `borderRadius`). |

Efectos incluidos: partículas al comer/romper/agarrar moneda, «+N» flotante, sacudida leve
en cada golpe, puntaje que rebota al subir, estela de la bola, polvo al aterrizar.

## Uso en Remotion

```tsx
<div style={{ borderRadius: 38, overflow: 'hidden' }}>
  <Juego tipo="saltador" desde={enPalabra(palabras, 'juego', 0)} ancho={640} alto={900} generar />
</div>
```

## Ejemplo en un guion JSON (cuando el motor lo conecte)

```json
{
  "tipo": "juego",
  "juego": "serpiente",
  "palabra": "snake",
  "generar": true,
  "nivel": 1,
  "paleta": { "colores": ["#F97316", "#C2410C", "#ffd23f", "#ffffff"] }
}
```
