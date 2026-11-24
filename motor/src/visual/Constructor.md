# Constructor

La escena icónica del vibe coding: ventana de un constructor de apps con IA, con el
chat arriba y la vista previa abajo. Se escribe el prompt letra por letra, el cursor hace
clic en «Enviar» (hundimiento + ripple), la IA marca sus pasos con ✓ mientras la vista
previa muestra un esqueleto, la app aparece con un leve zoom de cámara y el cursor toca
un botón de la app (por defecto «Pedir por mensaje» → «Pedido enviado» + aviso).

Ocupa la zona útil (x 70–950, y 250–1240). Prueba: `src/visual/prueba-constructor.tsx`.

## Props

| Prop | Tipo | Por defecto | Qué hace |
|---|---|---|---|
| `herramienta` | clave de `herramientas` (tema.ts) o `{ nombre, color, texto }` | `CONSTRUCTOR_GENERICO` («Constructor IA», violeta) | color y nombre en la barra, botón Enviar y ✓ |
| `prompt` | string | — | texto que se escribe (cabe bien hasta ~110 letras) |
| `pasos` | string[] | 3 pasos genéricos | pasos de la IA (caben 3–4) |
| `preview` | ReactNode o `({ tListo, tClick }) => ReactNode` | panadería | la app (838×424 px) |
| `clickEn` | `{ x, y }` | `{ 419, 364 }` | punto del botón de la app que toca el cursor (coordenadas de la app) |
| `url` | string | `mi-app.<nombre en minúsculas>.app` | dirección publicada |
| `tEscribir` | frame | 18 | empieza a escribirse el prompt |
| `tEnviar` | frame | 110 | clic en Enviar (el prompt termina 20 frames antes) |
| `tConstruir` | frame | `tEnviar + 14` | empieza el primer paso |
| `pasoDur` | frames | 26 | duración de cada paso; la app aparece en `tConstruir + pasos × pasoDur` |
| `tClick` | frame | `tListo + 36` | clic en el botón de la app |

## Ejemplo en un guion JSON (cuando el motor lo registre como `tipo: "constructor"`)

```json
{
  "tipo": "constructor",
  "prompt": "Hazme una app de pedidos para mi panadería, con menú y botón para pedir",
  "pasos": ["Creando pantallas", "Conectando base de datos", "Publicando"],
  "url": "la-espiga.constructoria.app",
  "enEnviar": "envías",
  "enClick": "pedido"
}
```

El motor convierte `enEnviar` / `enClick` en frames con `enPalabra(palabras, …)` y los pasa
como `tEnviar` / `tClick` (y `tEscribir ≈ tEnviar − 90`).

## Uso directo

```tsx
<Constructor herramienta={{ nombre: 'Mi Builder', color: '#0EA5E9', texto: '#fff' }} prompt="…" pasos={['A', 'B', 'C']} tEnviar={110} tClick={242} />
```
