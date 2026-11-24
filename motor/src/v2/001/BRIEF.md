# 001 «3 errores que arruinan tu café en casa» — brief de dirección (reel de ejemplo del motor)

## ROLE
Director y motion designer de un reel vertical de canal grande, sin cara, sobre la voz del guion
`guiones/001-demo.json`. Es el ejemplo que trae el motor: muestra todo el flujo (guion → voz → brief →
escenas → índice → render) con un tema neutro. Cada error es un objeto vivo en pantalla (hervidor con
termómetro, bolsa que pierde aroma, molinillo, balanza), nunca «texto sobre fondo».

## STORY (no inventes otros datos)
Creencia que se rompe: «el café amargo es culpa del grano». Tres errores: 1) agua hirviendo (quema el
café; esperar ~30 s), 2) moler con días de anticipación (moler justo antes), 3) medir a ojo (1 g de café
por cada 16 g de agua). CTA: «Comenta CAFÉ y te mando la guía con las medidas».
Cifras permitidas en pantalla: 3 (errores), 100 °C, 30 s, 90–96 °C (rango de preparación de uso común),
1 : 16, y el ejemplo derivado 20 g → 320 g. Nada más.

## Lienzo y zonas
1080×1920, 30 fps. Zona útil x 70–950, y 240–1240. Subtítulos (los pinta el ensamble) en y 1300–1450.
Titular arriba (left 80, top 250: kicker + titular, termina antes de y 640); escenario en y 660–1240.
La escena NO pinta fondo: el ensamble pone `Fondo` del kit.

## STYLE GUIDE (paleta Noche del kit + colores del café)
- Del kit: `N` (fondo, tarjeta, texto, meta #FFD166 = dato clave, rojo = error, ok = bien), `entra`,
  `sale`, `pop`, `contar`, `tecleo`, `deriva`, `Kicker`, `Tarjeta`, `Cursor`, `rutaCursor`.
- Un color por concepto (en `src/v2/001/comun.tsx`, constante `C`): café #C8895A / crema #F0C9A0,
  agua y temperatura buena #5AB0FF, agua hirviendo #FF6B4A, cerámica #ECE6DE.
- Piezas propias en `comun.tsx`: `Titular` (palabras `[frame, texto, color?]` con pop), `Vapor`,
  `Taza` (`tono` 0→1 quemado), `Sello`, `Etiqueta`.
- Tipos: Inter Tight 900 en titulares (100–120 px), JetBrains Mono en cifras de máquina y kickers.
  Texto ≥ 34 px.
- Movimiento: curva `ease`, entradas con desenfoque, pop en los sellos; push-in lento + `deriva` en
  cada escena; algo nuevo cada 1–2 s, cada momento cae en su palabra.

## BANNED
Marcas o logos reales (cafeteras, cafés, redes) · caras o personas · inglés en pantalla · cifras fuera
de STORY · emojis como íconos · Math.random / CSS transitions / setTimeout.

## TECHNICAL
Igual que `docs/CONSTRUIR.md`. `const T = (s: number) => enEscena(s, T0)`. Composiciones de prueba
`P001S<N>` (prueba = `<Fondo/>` + escena). Importa de `'../kit'` y de `'./comun'`.

## Escenas (segundos del AUDIO; voz en public/voz/001-demo/narracion.json)

### S1 · Gancho — t0 0,00 · t1 4,40 (132 f) · `S1Gancho.tsx`
Voz: ¿Tu@0.20 café@0.43 de@0.71 casa@0.94 sabe@1.22 amargo?@1.50–1.92 No@1.99 es@2.22 el@2.45
grano.@2.68–3.04 Son@3.10 tres@3.33 errores.@3.61–4.09
- Cuadro 0 (portada, fijo toda la escena): kicker «Café en casa», titular «3 errores que / arruinan tu
  café» (3 en amarillo, café en crema). Escenario: taza grande humeante a la izquierda y, a la
  derecha, tarjeta «Sabor» con medidor de aguja ya en AMARGO (rojo).
- «amargo»(1.50): la aguja tiembla y golpea el rojo, la taza se oscurece un poco; SFX error.
- «grano»(2.68): debajo del medidor entra un grano de café propio (SVG) tachado: «No es el grano».
- «tres»(3.33): fila de 3 fichas numeradas (Agua · Molienda · Medida) entra escalonada; pop en cada una.

### S2 · Agua hirviendo — t0 4,40 · t1 8,38 (119 f) · `S2Agua.tsx`
Voz: Uno:@4.52 agua@4.80 hirviendo.@5.08–5.61 Quema@5.70 el@6.05 café.@6.28–6.57 Espera@6.63
treinta@7.05 segundos.@7.54–8.06
- Kicker «Error 1»; titular «Agua hirviendo» (hirviendo en rojo-calor). Hervidor propio con burbujas y
  vapor fuerte a la izquierda; termómetro vertical a la derecha cuya cifra sube a 100 °C en «hirviendo».
- «Quema»(5.70): taza pequeña recibe el chorro, se oscurece, sello rojo «Quemado».
- «Espera»(6.63): el titular cambia a «Espera 30 s»; anillo de cuenta 30→0 junto al termómetro; el
  vapor se calma, la cifra baja a 93 °C y se enciende la franja azul «90–96 °C»; sello «Ideal» en
  «segundos»(7.54).

### S3 · Molienda y medida — t0 8,38 · t1 14,96 (198 f) · `S3Molienda.tsx`
Voz: Dos:@8.50 molerlo@8.78 días@9.27 antes.@9.55–9.91 Muélelo@9.97 justo@10.46 antes.@10.81–11.17
Tres:@11.23 medir@11.58 a@11.93 ojo.@12.16–12.40 Un@12.44 gramo@12.67 por@13.02 cada@13.25
dieciséis@13.53 de@14.14 agua.@14.38–14.67
- Acto A (0–84): kicker «Error 2», titular «Molido hace días». Bolsa de café abierta con barra «Aroma»
  que se vacía de 100 % a 20 % mientras pasan hojas de calendario (Lun → Mar → Mié) en «días».
  En «Muélelo»(9.97) la bolsa sale y entra un molinillo de manivela que gira; cae molienda fresca, la
  barra se llena en verde y sello «Al momento» en «justo»(10.46).
- Acto B (85–198): morph a «Error 3», titular «Medir a ojo». Cuchara colmada que tambalea con «¿?»
  en «ojo»(12.16). En «gramo»(12.67) entra una balanza digital: pantalla «1 g café» · «16 g agua»; en
  «dieciséis»(13.53) la proporción «1 : 16» se estampa en amarillo, y debajo el ejemplo «20 g → 320 g»
  cuenta en «agua»(14.38).

### S4 · CTA — t0 14,96 · t1 20,00 (151 f) · `S4Cta.tsx`
Voz: Comenta@15.07 CAFÉ@15.56 y@15.84 te@16.07 mando@16.31 la@16.66 guía@16.89 con@17.17 las@17.40
medidas.@17.63–18.10
- Titular «Comenta CAFÉ» (CAFÉ en amarillo). Caja de comentario de un post: se teclea «CAFÉ» en
  «CAFÉ»(15.56), cursor y clic en enviar.
- «mando»(16.31): llega un DM con la tarjeta del recurso «Guía: medidas del café» con 3 filas
  (Agua 90–96 °C · Muele al momento · 1 g : 16 g) que entran en «guía»(16.89)–«medidas»(17.63).
- Todo quieto y legible desde el frame 105 hasta el final (último 1,5 s).

MUSICA: duracion=20 quiebre=8.4
