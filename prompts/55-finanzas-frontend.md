# Finanzas — integración desde el frontend

Este documento describe cómo el frontend consume los endpoints del worker
`burgos-finanzas`, cuyo código está en `worker/` de este mismo repo. El módulo
de finanzas es para las 3 parejas del viaje: `TV` (Tere-Víctor),
`MD` (Maria-Dani), `YM` (Yoly-Mario).

> ⚠️ El backend también valida `TV`, `MD`, `YM` (no `VT`/`DM`/`MY`).

---

## Configuración base

```javascript
const WORKER = 'https://burgos-finanzas.victor-garcia-penyas.workers.dev';
const TOKEN  = '<valor de API_TOKEN>';   // = WORKER_TOKEN del .env
const VIAJE  = 'burgos';

const headers = { 'x-api-token': TOKEN };

// Las rutas de datos llevan el viaje; el OCR no lo necesita.
function api(path) {
  return WORKER + path + (path.indexOf('?') === -1 ? '?' : '&') + 'viaje=' + VIAJE;
}
```

## El parámetro `viaje`

El worker guarda un fichero de cuentas por viaje, para que las de uno no se
mezclen con las de otro. `?viaje=burgos` apunta a
`/Apps/burgos-finanzas/finanzas.json`; un slug que no esté en la tabla `VIAJES`
del worker devuelve 400.

La ruta la resuelve siempre el servidor, nunca el cliente: el token acaba
publicado en la web y las credenciales de Dropbox son de acceso total, así que
aceptar una ruta arbitraria del navegador abriría el Dropbox entero.

---

## Endpoints

### GET /finanzas — leer todos los datos

```javascript
const res  = await fetch(api('/finanzas'), { headers });
const data = await res.json();
// data = { gastos: [...], cancelaciones: [...] }
```

---

### POST /finanzas/gasto — añadir un gasto

```javascript
const res = await fetch(api('/finanzas/gasto'), {
  method:  'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    descripcion:   'Supermercado Lidl',
    importe:       34.50,          // número decimal
    pagador:       'TV',           // quién pagó: TV | MD | YM
    participantes: ['TV','MD','YM'], // mínimo 2, el pagador debe estar incluido
    fecha:         '2026-08-19',   // opcional — default: hoy en Europe/Madrid
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
const res = await fetch(api(`/finanzas/gasto/${gasto.id}`), {
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
const res = await fetch(api('/finanzas/cancelacion'), {
  method:  'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    de:          'MD',        // pareja que paga
    a:           'TV',        // pareja que cobra
    importe:     29.00,
    descripcion: 'Bizum',     // opcional
    fecha:       '2026-08-20' // opcional — default: hoy en Europe/Madrid
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
| 400 | Validación fallida, o viaje desconocido (ver mensaje en `error`) |
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
      "fecha":         "2026-08-19",
      "descripcion":   "Supermercado Lidl",
      "importe":       87.60,
      "pagador":       "TV",
      "participantes": ["TV", "MD", "YM"]
    }
  ],
  "cancelaciones": [
    {
      "id":          "uuid-v4",
      "fecha":       "2026-08-20",
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
- **Tab Añadir**: formulario con OCR de ticket, pagador (segmented control TV/MD/YM), participantes (checkboxes, todos marcados por defecto), fecha (default: hoy en Europe/Madrid)
- **Tab Pagar**: formulario de cancelación (de → a, importe, concepto opcional)

### Lógica de balance
Deuda pairwise: para cada gasto, cada participante que no es pagador debe `importe/n` al pagador.
Las cancelaciones reducen esa deuda. Se muestra el neto por par.

### Token
El `workerToken` se inyecta en build-time desde la variable de entorno `WORKER_TOKEN` vía `{{ workerToken }}` en la plantilla Nunjucks. Como queda dentro del HTML, `scripts/encrypt-finanzas.mjs` cifra la página después del build.

### Ficheros
- `worker/` — el worker: endpoints, tabla de viajes y OCR
- `src/finanzas.njk` — página principal de la app
- `src/posts/recursos_finanzas.md` — entrada en módulo Recursos
- `.eleventy.js` — shortcode `finanzas` añadido
- `src/styles.css` — clases `.fin-*`
- `scripts/encrypt-finanzas.mjs` — cifrado post-build
