# Bug: worker mariano-traductor devuelve 500 con imágenes

## Síntoma observado en el navegador (Firefox)

```
Access to fetch at 'https://mariano-traductor.victor-garcia-penyas.workers.dev/translate'
from origin 'http://localhost:8080' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.

POST https://mariano-traductor.victor-garcia-penyas.workers.dev/translate
net::ERR_FAILED 500 (Internal Server Error)

TypeError: Failed to fetch
```

## Causa raíz

El worker lanza un **500 Internal Server Error** al procesar peticiones
con imagen (multipart/form-data con campo `image`). Cuando Cloudflare
intercepta un error no controlado (500), devuelve su propia página de
error **sin las cabeceras CORS** que el worker añadiría normalmente.
El navegador no puede leer la respuesta y lo reporta como NetworkError.

Con texto funciona correctamente (200 OK). Solo falla con imagen.

## Verificación con curl (sin CORS, llega al worker directamente)

```bash
# Texto — funciona bien
curl -X POST https://mariano-traductor.victor-garcia-penyas.workers.dev/translate \
  -H "x-api-token: <token>" \
  -F "text=Guten Morgen"
# → 200 {"success":true,...}

# Imagen — falla
curl -X POST https://mariano-traductor.victor-garcia-penyas.workers.dev/translate \
  -H "x-api-token: <token>" \
  -F "image=@/ruta/a/foto.jpg"
# → probablemente 500 o error en el procesamiento
```

Reproduce el error con curl para ver el mensaje exacto del worker.

## Lo que hay que corregir

### 1. Arreglar el bug que causa el 500 con imágenes

Revisar el handler del campo `image` en `POST /translate`:
- La lectura del fichero desde FormData
- La conversión a base64 o buffer antes de enviarlo a Claude
- El armado del mensaje multimodal para la API de Claude
  (el campo `image` debe ir como `image_url` o `base64` según el SDK)

### 2. Añadir CORS headers en los errores no controlados

Aunque se arregle el 500, conviene protegerse para el futuro.
El worker debería tener un try/catch global que garantice que
**cualquier respuesta de error incluye las cabeceras CORS**:

```javascript
// Ejemplo de patrón defensivo
try {
  return await handleRequest(request);
} catch (err) {
  return new Response(JSON.stringify({ success: false, error: err.message }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-token',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
  });
}
```

## Contexto del frontend

- El frontend envía `multipart/form-data` con `fd.append('image', file)`
  donde `file` es un objeto `File` JPEG seleccionado por el usuario
- El frontend YA valida que el archivo sea `image/jpeg` antes de enviarlo
- El header `x-api-token` va en la petición, nunca `Content-Type` manual
- Con texto (`fd.append('text', '...')`) todo funciona perfectamente

## Estado actual del CORS (OPTIONS preflight)

```
access-control-allow-origin: *
access-control-allow-headers: Content-Type, x-api-token  ← ya corregido antes
access-control-allow-methods: GET, POST, OPTIONS
```

El preflight OPTIONS está bien. El problema es solo en las respuestas
de error (500) que Cloudflare sirve cuando el worker lanza una excepción.
