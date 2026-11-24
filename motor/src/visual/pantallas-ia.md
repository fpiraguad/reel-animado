# Pantallas de apps generadas con IA

Recetario de prompts para generar con un modelo de imágenes las pantallas de «la app
terminada» que se muestran dentro de `<Telefono imagen="…">`. Las imágenes NO vienen en el
repo: genéralas con el modelo que tengas (vertical, p. ej. 1024×1536) y guárdalas en
`public/ia/apps/`. Los negocios son inventados.

- **Truco que mejor funciona:** dar CADA texto entre comillas con su valor exacto y cerrar con
  «All text in Spanish, very short, spelled exactly as given, crisp and legible. No other text.»,
  más «flat screenshot only (no phone frame, no hands, no background)».
- Una calidad media basta: el teléfono la muestra pequeña. Con los textos dados así, suelen
  salir bien a la primera.
- Úsalas con `staticFile("ia/apps/<archivo>.png")`.

## 1. La Espiga — menú y pedido (cliente) — `public/ia/apps/espiga-menu.png`

```text
A clean, modern 2026 mobile app screen UI, flat screenshot only (no phone frame, no hands, no background), vertical. Ordering app for a Colombian bakery called "La Espiga". Warm cream background, terracotta accent color, rounded cards, generous spacing, bold sans-serif typography. Top: logo wordmark "La Espiga" and a small cart icon. A search bar. Category chips: "Panes", "Dulces", "Bebidas". A 2-column grid of 4 product cards, each with an appetizing realistic photo and a short name and price: "Pan de bono" $2.500, "Almojábana" $2.800, "Pan aliñado" $6.000, "Roscón" $4.500. Each card has a small round "+" button. Bottom: a wide terracotta button "Pedir · $15.800". All text in Spanish, very short, spelled exactly as given, crisp and legible. No other text.
```

## 2. La Espiga — pedidos de hoy (dueño) — `public/ia/apps/espiga-pedidos.png`

```text
A clean, modern 2026 mobile app screen UI, flat screenshot only (no phone frame, no hands, no background), vertical. Owner dashboard of the bakery app "La Espiga": today's orders. Warm cream background, terracotta accent color, rounded cards, bold sans-serif typography. Top: title "Pedidos de hoy" and a small bakery wheat logo. Three summary tiles in a row: "12 pedidos", "$186.000", "3 pendientes". Below, a list of 4 order cards, each with a customer first name, a short item line, a price and a colored status pill: "Ana" "6 pan de bono" $15.000 pill "Listo" (green); "Carlos" "1 roscón" $4.500 pill "En horno" (amber); "Marta" "4 almojábanas" $11.200 pill "Nuevo" (terracotta); "Luis" "2 pan aliñado" $12.000 pill "Entregado" (gray). Bottom tab bar with icons only. All text in Spanish, very short, spelled exactly as given, crisp and legible. No other text.
```

## 3. Barbería El Filo — reservar cita — `public/ia/apps/barberia-citas.png`

```text
A clean, modern 2026 mobile app screen UI, flat screenshot only (no phone frame, no hands, no background), vertical. Appointment booking app for a barbershop called "Barbería El Filo". Dark charcoal background, warm gold accent color, rounded cards, bold sans-serif typography. Top: wordmark "El Filo" with a small razor icon. A round profile photo of a smiling barber with the name "Andrés" and "★ 4,9". Section title "Elige el día" with a horizontal row of 5 date chips: "Lun 3", "Mar 4", "Mié 5" (selected, gold), "Jue 6", "Vie 7". Section title "Horario" with a grid of 6 time chips: "9:00", "10:00", "11:30" (selected, gold), "2:00", "3:30", "5:00". A service card: "Corte + barba" "$35.000". Bottom: a wide gold button "Reservar". All text in Spanish, very short, spelled exactly as given, crisp and legible. No other text.
```

## 4. Tienda Doña Rosa — inventario — `public/ia/apps/tienda-inventario.png`

```text
A clean, modern 2026 mobile app screen UI, flat screenshot only (no phone frame, no hands, no background), vertical. Inventory app for a small Colombian neighborhood store called "Tienda Doña Rosa". White background, fresh green accent color, rounded cards, bold sans-serif typography. Top: title "Inventario" and a small store icon. A red alert banner: "3 productos por agotarse". A list of 5 product rows, each with a small realistic product photo (generic unbranded packaging), a short name, a stock count and a thin progress bar: "Arroz 1 kg" "24 und" (green bar full); "Huevos" "6 und" (red bar low); "Leche" "18 und" (green); "Panela" "4 und" (red, low); "Aceite" "9 und" (amber). Bottom: a round green floating button with a "+" and a bottom tab bar with icons only. All text in Spanish, very short, spelled exactly as given, crisp and legible. No brand logos, no other text.
```
