#!/usr/bin/env bash
# Uso: ./make-hero-variants.sh imagen.jpg [opciones]
#
# Los originales pesados viven en src/images-master/ (fuera de git y del build);
# las variantes se publican en src/images/. Ejemplos:
#   src/images/make-hero-variants.sh src/images-master/burgos.png --out src/images
#   src/images/make-hero-variants.sh src/images-master/burgos.png --out src/images \
#     --ratio 4:5 --widths "400 600 900" --name burgos-vert
#
# Recorta la imagen al ratio indicado (16:9 por defecto) centrado, el rectángulo
# más grande posible, aplica los offsets y clampea para no salirse de los bordes.
# Genera las variantes en jpg, webp y avif (si avifenc está disponible).
set -euo pipefail

OFFSET_X=0
OFFSET_Y=0
OUT_DIR=""
RATIO="16:9"
WIDTHS="800 1200 1600"
NAME=""
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --offset_x)  OFFSET_X="$2"; shift 2 ;;
    --offset_y)  OFFSET_Y="$2"; shift 2 ;;
    --out|-o)    OUT_DIR="$2";  shift 2 ;;
    --ratio)     RATIO="$2";    shift 2 ;;
    --widths)    WIDTHS="$2";   shift 2 ;;
    --name)      NAME="$2";     shift 2 ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

if [ ${#POSITIONAL[@]} -lt 1 ]; then
  echo "Uso: $0 ruta/imagen.jpg [opciones]"
  echo "  --offset_x  desplaza el recorte horizontalmente (px, puede ser negativo)"
  echo "  --offset_y  desplaza el recorte verticalmente   (px, puede ser negativo)"
  echo "  --out       carpeta donde escribir las variantes (por defecto, la del original)"
  echo "  --ratio     proporción del recorte, formato W:H (por defecto 16:9)"
  echo "  --widths    anchos a generar, entrecomillados (por defecto \"800 1200 1600\")"
  echo "  --name      prefijo de los ficheros (por defecto, el nombre del original)"
  exit 1
fi

RATIO_W="${RATIO%%:*}"
RATIO_H="${RATIO##*:}"
if ! [[ "$RATIO_W" =~ ^[0-9]+$ && "$RATIO_H" =~ ^[0-9]+$ ]]; then
  echo "Ratio inválido: '$RATIO' (se espera W:H, p.ej. 16:9 o 4:5)"; exit 1
fi

ORIG="$(cd "$(dirname "${POSITIONAL[0]}")" && pwd)/$(basename "${POSITIONAL[0]}")"
BASE_NAME="$(basename "$ORIG")"
STEM="${NAME:-${BASE_NAME%.*}}"

if [ -n "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR"
  OUT_DIR="$(cd "$OUT_DIR" && pwd)"
else
  OUT_DIR="$(dirname "$ORIG")"
fi

cd "$OUT_DIR"

# Dimensiones originales
W_ORIG=$(identify -format "%w" "$ORIG")
H_ORIG=$(identify -format "%h" "$ORIG")
echo "Original: ${W_ORIG}x${H_ORIG}"

# Calcular crop al ratio pedido, con offsets y clamping
read -r CROP_W CROP_H X0 Y0 <<< "$(awk -v w="$W_ORIG" -v h="$H_ORIG" -v ox="$OFFSET_X" -v oy="$OFFSET_Y" -v rw="$RATIO_W" -v rh="$RATIO_H" '
BEGIN {
  if (w / h > rw / rh) {
    # Imagen más ancha que el ratio → ajustar por alto
    crop_h = h
    crop_w = int(h * rw / rh)
  } else {
    # Imagen más alta que el ratio → ajustar por ancho
    crop_w = w
    crop_h = int(w * rh / rw)
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

echo "Recorte ${RATIO}: ${CROP_W}x${CROP_H} desde +${X0}+${Y0}"

# Imagen recortada temporal
TMP="${STEM}-tmp-crop.jpg"
convert "$ORIG" -crop "${CROP_W}x${CROP_H}+${X0}+${Y0}" +repage "$TMP"

for W in $WIDTHS; do
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
echo "✓ ${STEM}-{$(echo $WIDTHS | tr ' ' ',')}.{jpg,webp,avif} en ${OUT_DIR}"
