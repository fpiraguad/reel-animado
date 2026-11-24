# TablaRevela

Tabla comparativa vertical (paleta oscura «Noche de laboratorio», Inter Tight + JetBrains Mono)
inspirada en los «reveals» de tablas comparativas virales: cada fila entra con sus dos celdas tapadas (bloque
borroso con brillo), un barrido amarillo las destapa, las cifras cuentan hasta su valor y a la
ganadora se le dibuja un recuadro amarillo con glow + insignia ✓ del color de su herramienta.
Al final, marcador «3 – 1» con pop y tarjeta de veredicto.

## Props

| Prop | Tipo | Qué hace |
|---|---|---|
| `a`, `b` | `{ nombre, color }` | Las dos herramientas (cabecera en su color). |
| `filas` | `{ criterio, a?, b?, gana: 'a'\|'b'\|'empate', t }[]` | `t` = frame del destape (la fila entra 14 frames antes; la celda `b` se destapa 6 frames después de la `a`). Valores con números cuentan («US$2.932», «61 h 47 min», separador de miles `.` o `,`). Sin valor → ✓ para el ganador y — para el otro. |
| `marcador` | `string` | «3 – 1»: cada lado toma el color de su herramienta. |
| `veredicto` | `string` | Texto de la tarjeta final. |
| `tVeredicto` | `number` | Frame del pop del marcador; la tarjeta entra 8 frames después. |
| `desde` | `number` (0) | Entrada de la tabla. |
| `fondo` | `boolean` (true) | Fondo oscuro con glow de colores y grano 5 %. `false` si la escena ya lo pinta. |

Cabe en la zona útil (x 70–950, y 250–1240) con hasta 4–5 filas (el alto de fila se ajusta).
Destape a destape conviene dejar ≥ 40 frames para que se vea el recuadro dibujarse.

## Ejemplo en un guion JSON

```json
{
  "tipo": "tablaRevela",
  "a": { "nombre": "Agente A", "color": "#F97316" },
  "b": { "nombre": "Agente B", "color": "#3B82F6" },
  "filas": [
    { "criterio": "Diseño y pruebas", "gana": "b", "t": 30 },
    { "criterio": "Funciona de punta a punta", "gana": "a", "t": 75 },
    { "criterio": "Tiempo", "a": "5 h 32 min", "b": "61 h 47 min", "gana": "a", "t": 120 },
    { "criterio": "Costo (equiv. API)", "a": "US$832", "b": "US$2.932", "gana": "a", "t": 165 }
  ],
  "marcador": "3 – 1",
  "veredicto": "En esta tarea, ganó Agente A",
  "tVeredicto": 218
}
```

Prueba: `npx remotion render src/visual/prueba-tabla-revela.tsx PruebaTablaRevela out/visual/tabla-revela/prueba.mp4`
