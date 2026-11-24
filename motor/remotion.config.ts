import { Config } from '@remotion/cli/config'

// JPEG por cuadro: renders más rápidos que PNG y sin diferencia visible en el MP4 final.
Config.setVideoImageFormat('jpeg')

// Núcleos por render. Más no siempre es más rápido: mide en tu máquina con
// `npx remotion benchmark` y fija aquí el mejor valor (p. ej. la mitad de tus núcleos).
// Config.setConcurrency(8)
