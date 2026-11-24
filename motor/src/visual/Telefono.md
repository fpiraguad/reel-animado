# Telefono

Celular moderno (marco negro con canto 3D, isla, botones laterales, sombra de piso) que entra
con un giro 3D (llega inclinado desde abajo/lado y se endereza en ~2 s), flota mientras está en
pantalla y muestra una app dentro. Prueba: `src/visual/prueba-telefono.tsx` (comp `PruebaTelefono`).

Todo lo de adentro se escribe en **puntos lógicos de 390 × 844** (como un celular moderno); el componente
lo escala a `alto`. Toques y notificación usan esas mismas coordenadas.

## Props

| prop | tipo | por defecto | qué hace |
|---|---|---|---|
| `desde` | frame | 0 | empieza la entrada (giro 3D) |
| `hasta` | frame | — | empieza la salida (gira hacia el otro lado y se desvanece) |
| `alto` | px | 820 | alto del cuerpo en el video |
| `x`, `y` | px | 540, 828 | centro del teléfono (deja sitio a un titular en y≈250–400) |
| `lado` | `'izquierda'`/`'derecha'` | izquierda | lado desde el que llega girando |
| `children` | ReactNode | — | la app (puede animarse sola con `useCurrentFrame`) |
| `imagen` | ruta en `public/` | — | captura en lugar de children (va por `staticFile`, ancho completo) |
| `scroll` | `{desde, hasta, px}` | — | baja el contenido `px` puntos entre esos frames (curva suave) |
| `toques` | `{x, y, frame}[]` | [] | dedo + doble onda sobre la pantalla en ese frame |
| `notificacion` | `{titulo, texto, icono?, app?, color?, frame, dura?}` | — | banner que baja bajo la isla en `frame` y sube tras `dura` (80) frames; `icono` = nombre lucide (`'shopping-bag'` o `'ShoppingBag'`) |
| `barra` | bool | sí con children, no con imagen | barra de estado 9:41 / señal / batería (empuja el contenido 54 pt) |
| `fondo` | color | `#fff` | fondo de la pantalla |

También exporta `PANTALLA_W`, `PANTALLA_H` e `iconoLucide(nombre)`.

## Ejemplo en un guion JSON (propuesto: escena `telefono`)

```json
{
  "tipo": "telefono",
  "titular": "Tu panadería, *en el bolsillo*",
  "imagen": "capturas/espiga-pedidos.png",
  "scroll": { "desde": 60, "hasta": 120, "px": 420 },
  "toques": [{ "x": 200, "y": 345, "frame": 128 }, { "x": 195, "y": 774, "frame": 196 }],
  "notificacion": { "titulo": "Nuevo pedido", "texto": "2 croissants", "icono": "shopping-bag", "app": "La Espiga", "color": "#E8833A", "frame": 150 }
}
```

El motor puede atar cada `frame` a una palabra con `enPalabra(palabras, 'pedido', 150)`.

```tsx
<Telefono desde={0} toques={[{ x: 200, y: 345, frame: 128 }]} notificacion={{ titulo: 'Nuevo pedido', texto: '2 croissants', icono: 'shopping-bag', frame: 150 }}>
  <MiApp />
</Telefono>
```
