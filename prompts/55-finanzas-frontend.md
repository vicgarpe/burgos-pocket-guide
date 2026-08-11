# Finanzas — integración desde el frontend

Este documento describe cómo el frontend consume los endpoints de finanzas
del worker `mariano-traductor`. El módulo de finanzas es para las 3 parejas
del viaje: `TV` (Tere-Víctor), `MD` (Maria-Dani), `YM` (Yoly-Mario).

> ⚠️ El backend también debe validar `TV`, `MD`, `YM` (no `VT`/`DM`/`MY`).

---

## Configuración base

```javascript
const WORKER = 'https://mariano-traductor.victor-garcia-penyas.workers.dev';
const TOKEN  = '<valor de API_TOKEN>';   // mismo token que usa /translate

const headers = { 'x-api-token': TOKEN };
```

---

## Endpoints

### GET /finanzas — leer todos los datos

```javascript
const res  = await fetch(`${WORKER}/finanzas`, { headers });
const data = await res.json();
// data = { gastos: [...], cancelaciones: [...] }
```

---

### POST /finanzas/gasto — añadir un gasto

```javascript
const res = await fetch(`${WORKER}/finanzas/gasto`, {
  method:  'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    descripcion:   'Supermercado Lidl',
    importe:       34.50,          // número decimal
    pagador:       'TV',           // quién pagó: TV | MD | YM
    participantes: ['TV','MD','YM'], // mínimo 2, el pagador debe estar incluido
    fecha:         '2026-03-19',   // opcional — default: hoy en Europe/Berlin
  }),
});
const gasto = await res.json();
// gasto = { id, fecha, descripcion, importe, pagador, participantes }
```

**Validaciones que hace el worker (devuelve 400 si fallan):**
- `descripcion` requerida
- `importe` número positivo
- `pagador` debe ser `TV`, `MD` o `YM`
- `participantes` array de 2 o 3 valores válidos
- `pagador` debe estar en `participantes`

---

### DELETE /finanzas/gasto/:id — eliminar un gasto

```javascript
const res = await fetch(`${WORKER}/finanzas/gasto/${gasto.id}`, {
  method:  'DELETE',
  headers,
});
const data = await res.json();
// { success: true }  →  borrado
// { success: false, error: 'Gasto no encontrado.' }  →  404
```

---

### POST /finanzas/cancelacion — registrar un pago entre parejas

```javascript
const res = await fetch(`${WORKER}/finanzas/cancelacion`, {
  method:  'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    de:          'MD',        // pareja que paga
    a:           'TV',        // pareja que cobra
    importe:     29.00,
    descripcion: 'Bizum',     // opcional
    fecha:       '2026-03-21' // opcional — default: hoy en Europe/Berlin
  }),
});
const cancelacion = await res.json();
// cancelacion = { id, fecha, de, a, importe, descripcion }
```

---

### POST /finanzas/ocr — extraer datos de un ticket con IA

Acepta la imagen de dos formas:

**Opción A — multipart/form-data (desde un input file del navegador):**

```javascript
const fd = new FormData();
fd.append('imagen', fileObject);   // File del input[type=file], cualquier formato

const res  = await fetch(`${WORKER}/finanzas/ocr`, {
  method:  'POST',
  headers,                         // sin Content-Type — lo pone el navegador
  body:    fd,
});
const data = await res.json();
```

**Opción B — JSON con base64:**

```javascript
const res  = await fetch(`${WORKER}/finanzas/ocr`, {
  method:  'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body:    JSON.stringify({
    imagen_b64: '<base64 de la imagen>',
    media_type: 'image/jpeg',      // opcional, default image/jpeg
  }),
});
const data = await res.json();
```

**Respuesta:**

```json
{
  "fecha":            "2026-03-18",
  "importe":          34.50,
  "descripcion":      "Lidl",
  "confiabilidad_ocr": "Imagen clara, valores extraídos con alta confianza."
}
```

Si no puede extraer un campo, devuelve `null` en ese campo.

**Flujo recomendado:** llamar a `/finanzas/ocr` primero y usar el resultado
para pre-rellenar el formulario de `POST /finanzas/gasto`. El usuario revisa
y confirma antes de guardar.

---

## Errores comunes

| Código | Causa |
|--------|-------|
| 401 | Token ausente o incorrecto |
| 400 | Validación fallida (ver mensaje en `error`) |
| 404 | ID de gasto no encontrado (DELETE) |
| 502 | Error en Dropbox o en Claude |

Todos los errores devuelven `{ success: false, error: "..." }`.

---

## Estructura de finanzas.json (referencia)

```json
{
  "gastos": [
    {
      "id":            "uuid-v4",
      "fecha":         "2026-03-19",
      "descripcion":   "Supermercado Lidl",
      "importe":       87.60,
      "pagador":       "TV",
      "participantes": ["TV", "MD", "YM"]
    }
  ],
  "cancelaciones": [
    {
      "id":          "uuid-v4",
      "fecha":       "2026-03-21",
      "de":          "MD",
      "a":           "TV",
      "importe":     30.00,
      "descripcion": "Transferencia Bizum"
    }
  ]
}
```

---

## Frontend implementado — `src/finanzas.njk` → `/finanzas/`

### Acceso y autenticación
- Acceso desde `src/posts/recursos_finanzas.md` vía shortcode `{% finanzas "Abrir Finanzas..." %}`
- Gate de contraseña en `/finanzas/`: password fijo `bollagas`
- Contraseña guardada en cookie `fin_ok=1` durante 30 días (no se vuelve a pedir)
- Password incorrecto → el campo tiembla y se vacía, sin mensaje de error

### Estructura de la app
- **Balance** (siempre visible): 3 filas (TV↔MD, TV↔YM, MD↔YM) con quién debe a quién o "Saldados ✓"
- **Tab Gastos**: lista de gastos ordenada por fecha (más reciente primero) con botón eliminar
- **Tab Añadir**: formulario con OCR de ticket, pagador (segmented control TV/MD/YM), participantes (checkboxes, todos marcados por defecto), fecha (default: hoy en Europe/Berlin)
- **Tab Pagar**: formulario de cancelación (de → a, importe, concepto opcional)

### Lógica de balance
Deuda pairwise: para cada gasto, cada participante que no es pagador debe `importe/n` al pagador.
Las cancelaciones reducen esa deuda. Se muestra el neto por par.

### Token
El `workerToken` se inyecta en build-time desde la variable de entorno `WORKER_TOKEN` vía `{{ workerToken }}` en la plantilla Nunjucks.

### Ficheros
- `src/finanzas.njk` — página principal de la app
- `src/posts/recursos_finanzas.md` — entrada en módulo Recursos
- `.eleventy.js` — shortcode `finanzas` añadido
- `src/styles.css` — clases `.fin-*`
