# Especificaciones frontend — worker mariano-traductor

Este documento describe cómo el frontend consume el worker y qué se
necesita corregir en él para que funcione desde el navegador.

---

## Problema urgente: CORS bloqueando x-api-token

El worker devuelve este preflight OPTIONS:

```
access-control-allow-origin: *
access-control-allow-headers: Content-Type
access-control-allow-methods: GET, POST, OPTIONS
```

El frontend envía el header `x-api-token` en todas las peticiones.
El navegador hace el preflight y al no ver `x-api-token` en
`access-control-allow-headers`, bloquea la petición con:

> NetworkError when attempting to fetch resource.

**Fix necesario en el worker:** añadir `x-api-token` a los headers
permitidos en la respuesta CORS:

```
access-control-allow-headers: Content-Type, x-api-token
```

Verifica que este cambio se aplica tanto en la respuesta al OPTIONS
como en las respuestas reales (GET, POST).

---

## Cómo llama el frontend al worker

### Health check
```javascript
fetch('https://mariano-traductor.victor-garcia-penyas.workers.dev/health', {
  headers: { 'x-api-token': TOKEN }
})
```

### Traducción de texto
```javascript
const fd = new FormData();
fd.append('text', 'Guten Morgen');
fd.append('context', 'saludo matutino');  // opcional

fetch('https://mariano-traductor.victor-garcia-penyas.workers.dev/translate', {
  method: 'POST',
  headers: { 'x-api-token': TOKEN },   // ← SOLO este header, sin Content-Type
  body: fd                              // FormData pone el Content-Type + boundary solo
})
```

### Traducción de imagen
```javascript
const fd = new FormData();
fd.append('image', fileObject);           // File JPEG del input[type=file]
fd.append('context', 'menú restaurante'); // opcional

fetch('https://mariano-traductor.victor-garcia-penyas.workers.dev/translate', {
  method: 'POST',
  headers: { 'x-api-token': TOKEN },
  body: fd
})
```

**Importante:** el frontend nunca pone `Content-Type` manualmente.
Lo gestiona el navegador para que el boundary del multipart sea correcto.

---

## Respuesta esperada (POST /translate — éxito)

```json
{
  "success": true,
  "result": {
    "texto_original": "Guten Morgen",
    "texto_traducido": "Buenos días",
    "fragmentos": [
      { "original": "Guten Morgen", "traduccion": "Buenos días" }
    ],
    "notas": "Saludo matutino estándar.",
    "mariano": "Odo pijo, con lo que me cuesta oír ese alemán..."
  },
  "uso": {
    "input_tokens": 849,
    "output_tokens": 161
  }
}
```

El frontend usa todos estos campos:
- `texto_original` → bloque "Original"
- `texto_traducido` → bloque "Traducción" (destacado)
- `fragmentos` → tabla fila a fila (solo si hay más de 1 fragmento)
- `notas` → bloque "Notas" (si existe)
- `mariano` → bloque especial con estilo informal/bronco (si existe)

---

## Errores que maneja el frontend

| Código | Causa | Lo que muestra el frontend |
|---|---|---|
| 401 | Token ausente o incorrecto | Mensaje de error genérico |
| 400 | Ni image ni text, o imagen no JPEG | Mensaje de error genérico |
| 502 | Error en llamada a Claude | Mensaje de error genérico |
| Red | CORS, timeout, worker caído | "Error de red. Comprueba la conexión." |

Si `success: false`, el frontend muestra `data.error` si existe.

---

## Orígenes desde los que llega el frontend

- Desarrollo local: `http://localhost:8080`
- Producción: `https://vicgarpe.github.io`

El worker tiene CORS abierto (`*`) para el origin, lo cual está bien.
Solo falta añadir `x-api-token` a los allowed headers.
