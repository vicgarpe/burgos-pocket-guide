# Heroes e imágenes — Estado de implementación

## ✅ Hecho

### Script make-hero-variants.sh
- Recorte automático a 16:9 centrado (el rectángulo más grande posible)
- Argumentos opcionales `--offset_x n` y `--offset_y n` para desplazar el recorte
- Argumento `--out dir` para escribir las variantes en otra carpeta (los originales
  viven fuera de `src/images/`)
- Clamping: el rectángulo nunca se sale de los bordes de la imagen original
- Genera variantes 800/1200/1600 en jpg, webp y avif (si avifenc disponible)
- Uso: `src/images/make-hero-variants.sh src/images-master/burgos.png --out src/images`
- Offset negativo en Y = sube el rectángulo (útil si se corta la cabeza)

### Organización de las imágenes
- **Originales pesados** (PNG de ~3 MB): en `src/images-master/`, ignorado por git y
  fuera del passthrough de Eleventy, así que no se publican.
- **Variantes publicables**: en `src/images/`, que sí se copia a `_site/images/`.

### Heroes añadidos
- Portada (`src/index.njk`) → `burgos-*` con `<picture>` multiformato
- `2026-08-18-llegada.md` → `llegada-800.jpg`
- `2026-08-19-atapuerca.md` → `atapuerca_grupo-800.jpg`
- `2026-08-20-regreso.md` → `vuelta-800.jpg`
- Fichas sin foto propia (`historia_*`, `recursos_transporte`) → `placeholder-hero.svg`

### Portada optimizada para móvil
- `<picture>` con fuentes avif/webp/jpg y `srcset` + `sizes`
  (`(max-width: 576px) 100vw, 960px`), de modo que en móvil se sirve la variante 800
- `fetchpriority="high"` en el hero (es el LCP) en lugar de `loading="lazy"`
- `width`/`height` explícitos para evitar saltos de layout
- Resultado: la home pasó de ~11,5 MB a ~600 KB en móvil

### Nav móvil
- Añadido media query `@media (max-width: 400px)` para reducir gap y letra
- Evita que "GALERÍA" se salga de pantalla en móviles pequeños

## 🔲 Pendiente

- Fotos reales para las fichas de historia (`historia_burgos`, `historia_atapuerca`,
  `historia_catedral`), que ahora usan el placeholder SVG
- Aplicar el mismo `<picture>` multiformato en `post.njk` (hoy usa un `<img>` simple
  con `hero | url`, por eso los heroes de los posts apuntan al `.jpg` de 800)
