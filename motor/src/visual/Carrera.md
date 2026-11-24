# Carrera

Carrera vertical en dos carriles (paleta «Noche de laboratorio»): cada carril tiene marca + nombre,
cronómetro odómetro (h:mm, JetBrains Mono, amarillo), costo que sube con «tick» y barra, una mini app
de formulario que se arma por bloques (título → pregunta 1 → pregunta 2 → botón) y barra de progreso.
A llega primero en `tLlegaA`: flash, glow, insignia «LLEGÓ» sobre la meta, cronómetro congelado y
empuje de cámara hacia su carril; B se dispara en time-lapse hasta su tiempo final en `tLlegaB` y
muestra la diferencia («+56:15 h»). Pinta su propio fondo oscuro (pantalla completa) con grano.

Prueba: `src/visual/prueba-carrera.tsx` → composición `PruebaCarrera` (9 s).

## Props

| Prop | Tipo | Qué es |
|---|---|---|
| `a`, `b` | `Corredor` | `a` es el que llega primero |
| `desde` | frame | entra la pieza (los cronómetros arrancan en `desde + 20`) |
| `tLlegaA` | frame | A cruza la meta (atar a «terminó en cinco horas») |
| `tLlegaB` | frame | B termina (atar a «sesenta y una horas») |
| `textos` | parcial | `tiempo`, `costo`, `notaCosto` («equivalente en API»), `progreso`, `llego` («LLEGÓ»), `enVivo`, `meta`, `vs`, `diferenciaB` (vacío = se calcula) |

`Corredor`: `nombre`, `color`, `color2` (fin del degradado), `marca` (`'chispa'` | `'nudo'`: símbolos geométricos genéricos),
`tiempo` («5:32»), `costo` (832), `app` (`AppMini`: `nombre`, `url`, `fondo`, `tinta`, `tinta2`,
`acento`, `titulo`, `pregunta1`, `pregunta2`, `boton`, `tituloSerif?`).

Deja al menos ~90 frames entre `tLlegaA` y `tLlegaB` para que se lea el time-lapse de B.

## Ejemplo en un guion JSON

```json
{
  "tipo": "carrera",
  "desde": 0,
  "tLlegaA": { "palabra": "cinco", "porDefecto": 120 },
  "tLlegaB": { "palabra": "sesenta", "porDefecto": 220 },
  "a": {
    "nombre": "Agente A", "color": "#F97316", "color2": "#FDBA74", "marca": "chispa",
    "tiempo": "5:32", "costo": 832,
    "app": { "nombre": "Formora", "url": "formora.app", "fondo": "#F4F1EA", "tinta": "#141413", "tinta2": "#6B6A65",
             "acento": "#C2410C", "titulo": "Planeemos un lanzamiento", "pregunta1": "¿Qué tan probable es que nos recomiendes?",
             "pregunta2": "¿Cuál es tu correo?", "boton": "Enviar", "tituloSerif": true }
  },
  "b": {
    "nombre": "Agente B", "color": "#3B82F6", "color2": "#93C5FD", "marca": "nudo",
    "tiempo": "61:47", "costo": 2932,
    "app": { "nombre": "Rillform", "url": "rillform.app", "fondo": "#FFFFFF", "tinta": "#16161D", "tinta2": "#70707C",
             "acento": "#6D4AFF", "titulo": "¿Qué tan de acuerdo estás?", "pregunta1": "El onboarding fue fácil de entender",
             "pregunta2": "¿Dónde te enviamos el resumen?", "boton": "Enviar respuestas" }
  }
}
```

En TSX: `<Carrera {...carreraEjemplo} />` (el objeto está exportado en `prueba-carrera.tsx`).
