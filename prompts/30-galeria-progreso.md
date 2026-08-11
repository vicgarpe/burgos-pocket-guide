# Galería — Estado de implementación

## ✅ Módulo cerrado y en producción

- Galería Dropbox con grid de columnas CSS (proporciones naturales, fotos y vídeos)
- Cifrado AES-256-GCM post-build en `scripts/encrypt-galeria.mjs`
  - `npm run serve` → galería sin contraseña (dev)
  - `npm run build` → galería cifrada con password `bollagas`; incorrecto → redirige a home
- Credenciales Dropbox en `.env` (ignorado por git) + GitHub Secrets para CI/CD
- Carpeta Dropbox: `/Almacen-archivo/2026-berlin`
- Subida con progreso real (XHR + spinner braille + mensajes técnicos por chunks)
- Umbrales de chunk: 100 MB (producción), configurables en `src/_data/galeria.json`
- Autorename propio antes de subir para evitar sobreescribir duplicados
- Modo selección (pulsación larga) + descarga múltiple con progreso
- Lightbox con poster inmediato en vídeos y preload agresivo
- EXIF completo en doble tap sobre el caption: cámara, focal, apertura, ISO, flash, WB
- Coordenadas GPS con etiqueta MAPS idéntica a las fichas (via exifr full CDN jsDelivr)
- Nombre del archivo en el overlay EXIF

## Notas técnicas

- `dotenv` v17 como devDependency
- `exifr@7/dist/full.umd.js` desde jsDelivr (solo en galería)
- Build script: `eleventy --input=src && node scripts/encrypt-galeria.mjs`
- PBKDF2 250.000 iteraciones, AES-256-GCM
- `src/_data/galeria.json`: `uploadChunkThreshold` y `uploadPartSize` en MB
