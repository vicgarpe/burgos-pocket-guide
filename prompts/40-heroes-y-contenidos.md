# Heroes e imágenes — Estado de implementación

## ✅ Hecho

### Script make-hero-variants.sh
- Recorte automático a 16:9 centrado (el rectángulo más grande posible)
- Argumentos opcionales `--offset_x n` y `--offset_y n` para desplazar el recorte
- Clamping: el rectángulo nunca se sale de los bordes de la imagen original
- Genera variantes 800/1200/1600 en jpg, webp y avif (si avifenc disponible)
- Uso: `./make-hero-variants.sh imagen.jpg [--offset_x n] [--offset_y n]`
- Offset negativo en Y = sube el rectángulo (útil si se corta la cabeza)

### Heroes añadidos
- `historia_muro.md` → `salto-soldado-800.webp` (original 527×412, recorte 16:9)
- `historia_nazismo.md` → `nacismo-800.webp` (original 640×512, recorte 16:9)
- `historia_sachsenhausen.md` → `sachsenhausen-800.webp` (original 1920×1080, ya era 16:9)

### Nav móvil
- Añadido media query `@media (max-width: 400px)` para reducir gap y letra
- Evita que "GALERÍA" se salga de pantalla en móviles pequeños

## 🔲 Pendiente

- Heroes para fichas de agenda (2026-03-18 llegada, 19 muro monumental, 20 sachsenhausen, 21 muro memorial)
- Hero para fichas de recursos (recursos_meteo, recursos_metro)
- Revisar si el template `post.njk` podría mejorarse con `<picture>` para servir avif automáticamente según soporte del navegador

## Notas técnicas

- El template `post.njk` usa un `<img>` simple con `hero | url` — sin `<picture>` multiformato
- Por eso se usa webp (compatibilidad universal) en lugar de avif como hero
- Las imágenes originales se guardan en `src/images/` junto con sus variantes
