# AppSeArma

Celular (390×800 lógicos, escalable) cuya app se construye sola: esqueleto gris con brillo →
barra superior (logo con resorte) → cada bloque se materializa en orden con su color →
el botón hace «pop» con un brillo → destello diagonal, anillo de marca y la isla dinámica
se abre con «✓ App lista».

```tsx
import { AppSeArma, duracionAppSeArma } from './visual/AppSeArma'
<AppSeArma app={app} desde={20} ritmo={14} escala={1.1} estilo={{ position: 'absolute', left: 70, top: 340 }} />
```

## Props

| prop | tipo | qué hace |
|---|---|---|
| `app` | `AppDef` | la app entera (abajo) |
| `desde` | frame | entra el celular; la barra superior se arma en `desde + 16` |
| `ritmo` | frames | separación entre bloques. El bloque *i* (0 = primero de `bloques`) se materializa en `desde + 16 + (i+1)·ritmo` — ahí se ata a la palabra |
| `soloFinal` | bool | pinta la app ya armada, sin animación ni insignia |
| `escala` | número | 1 = 390×800 px; 1.1 deja dos celulares lado a lado en la zona útil (x 70–950) |
| `estilo` | CSS | posición del contenedor |

`duracionAppSeArma(app, ritmo)` = frames hasta que termina el destello «lista» (desde `desde`).

## AppDef

```ts
{ nombre, sub?, color: '#RRGGBB', emoji? | icono? (nombre lucide, p. ej. 'Dumbbell'), bloques: Bloque[] }
```

Bloques (`tipo`):
- `saludo` — `titulo`, `sub?`
- `stat` — `etiqueta`, `valor` (el número dentro cuenta desde 0, con puntos de miles), `cambio?`, `icono?`
- `tarjetas` — `items: [{ etiqueta, valor, icono? | emoji? }]` (2–3 en fila)
- `lista` — `titulo?`, `accion?`, `items: [{ titulo, sub?, valor?, emoji?, alerta? }]` (`alerta` = pastilla roja que late)
- `grafico` — `forma: 'barras' | 'linea'`, `valores`, `etiquetas?`, `resaltar?` (índice; por defecto el último), `marca?` (texto sobre la barra resaltada), `total?`, `titulo?`
- `calendario` — `titulo?`, `dias?: [{ d, n }]`, `activo?`, `citas: [{ hora, nombre, servicio? }]`
- `boton` — `texto`, `icono?`

Texto con contraste automático sobre el color de marca (blanco o tinta). Caben ~700 px de
bloques; lo que pase de 800 se recorta.

## En un guion JSON

```json
{
  "tipo": "app",
  "app": {
    "nombre": "Tienda Lupita", "sub": "Inventario", "color": "#E8590C", "emoji": "🛒",
    "bloques": [
      { "tipo": "stat", "etiqueta": "Vendido hoy", "valor": "$1.240.000", "cambio": "+18%" },
      { "tipo": "grafico", "titulo": "Ventas de la semana", "forma": "barras",
        "valores": [620, 810, 540, 930, 760, 1120, 1240], "etiquetas": ["L","M","M","J","V","S","D"],
        "marca": "$1,24 M", "total": "$6,0 M" },
      { "tipo": "lista", "titulo": "Productos", "items": [
        { "emoji": "🍞", "titulo": "Pan tajado", "sub": "3 unidades", "alerta": "quedan 3" } ] }
    ]
  },
  "desde": "inventario",
  "ritmo": 14
}
```

(`desde` como palabra se resuelve con `enPalabra` en la escena que la monte.)

Prueba: `src/visual/prueba-app-se-arma.tsx` → `PruebaAppSeArma` (8 s, dos apps),
`PruebaAppSeArmaFinal` y `PruebaAppSeArmaTipos` (fotogramas fijos con `soloFinal`).
