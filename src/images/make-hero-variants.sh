#!/usr/bin/env bash
# Uso: ./make-hero-variants.sh imagen.jpg [--offset_x n] [--offset_y n]
#
# Recorta la imagen al ratio 16:9 centrado (el rectángulo más grande posible),
# aplica los offsets indicados y clampea para no salirse de los bordes.
# Genera variantes 800/1200/1600 en jpg, webp y avif (si avifenc está disponible).
set -euo pipefail

OFFSET_X=0
OFFSET_Y=0
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --offset_x) OFFSET_X="$2"; shift 2 ;;
    --offset_y) OFFSET_Y="$2"; shift 2 ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

if [ ${#POSITIONAL[@]} -lt 1 ]; then
  echo "Uso: $0 ruta/imagen.jpg [--offset_x n] [--offset_y n]"
  echo "  --offset_x  desplaza el recorte horizontalmente (px, puede ser negativo)"
  echo "  --offset_y  desplaza el recorte verticalmente   (px, puede ser negativo)"
  exit 1
fi

ORIG="${POSITIONAL[0]}"
BASE_DIR="$(dirname "$ORIG")"
BASE_NAME="$(basename "$ORIG")"
STEM="${BASE_NAME%.*}"

cd "$BASE_DIR"

# Dimensiones originales
W_ORIG=$(identify -format "%w" "$BASE_NAME")
H_ORIG=$(identify -format "%h" "$BASE_NAME")
echo "Original: ${W_ORIG}x${H_ORIG}"

# Calcular crop 16:9 con offsets y clamping
read -r CROP_W CROP_H X0 Y0 <<< "$(awk -v w="$W_ORIG" -v h="$H_ORIG" -v ox="$OFFSET_X" -v oy="$OFFSET_Y" '
BEGIN {
  if (w / h > 16.0 / 9.0) {
    # Imagen más ancha que 16:9 → ajustar por alto
    crop_h = h
    crop_w = int(h * 16.0 / 9.0)
  } else {
    # Imagen más alta que 16:9 → ajustar por ancho
    crop_w = w
    crop_h = int(w * 9.0 / 16.0)
  }

  # Centro con offset aplicado
  x0 = int((w - crop_w) / 2) + ox
  y0 = int((h - crop_h) / 2) + oy

  # Clamp: el rectángulo no puede salirse de la imagen
  if (x0 < 0)            x0 = 0
  if (y0 < 0)            y0 = 0
  if (x0 + crop_w > w)   x0 = w - crop_w
  if (y0 + crop_h > h)   y0 = h - crop_h

  print crop_w, crop_h, x0, y0
}')"

echo "Recorte 16:9: ${CROP_W}x${CROP_H} desde +${X0}+${Y0}"

# Imagen recortada temporal
TMP="${STEM}-tmp-crop.jpg"
convert "$BASE_NAME" -crop "${CROP_W}x${CROP_H}+${X0}+${Y0}" +repage "$TMP"

for W in 800 1200 1600; do
  echo "  → ${W}px..."

  # JPG
  convert "$TMP" -strip -resize "${W}x" -quality 82 "${STEM}-${W}.jpg"

  # WebP
  if command -v cwebp &>/dev/null; then
    cwebp -q 82 -mt -sharp_yuv -quiet "${STEM}-${W}.jpg" -o "${STEM}-${W}.webp"
  fi

  # AVIF (intenta dos variantes de flags según versión de avifenc)
  if command -v avifenc &>/dev/null; then
    avifenc --min 20 --max 30 --speed 6 "${STEM}-${W}.jpg" -o "${STEM}-${W}.avif" 2>/dev/null \
      || avifenc --min 20 --max 30 -s 6  "${STEM}-${W}.jpg" -o "${STEM}-${W}.avif" 2>/dev/null \
      || echo "    (avif omitido)"
  fi
done

rm "$TMP"
echo "✓ ${STEM}-{800,1200,1600}.{jpg,webp,avif}"
