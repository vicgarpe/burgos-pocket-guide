# Prompt para Claude Code CLI
# Proyecto: Frontend Eleventy que consume el worker mariano-traductor
# Cómo usarlo: abre Claude Code en la carpeta de tu proyecto Eleventy y pega este prompt

---

Vamos a añadir a un proyecto Eleventy existente un traductor de alemán integrado con el worker de Cloudflare `mariano-traductor`. El worker ya está desplegado y funcionando. Solo necesitamos el frontend.

## Datos del worker

- **URL base:** `https://mariano-traductor.victor-garcia-penyas.workers.dev`
- **Header obligatorio en todas las peticiones:** `x-api-token: 57102ab312c10e2383c6bc01ea2933ba`
- **CORS:** abierto, el worker acepta peticiones desde cualquier origen

## Endpoints disponibles

### GET /health
Comprueba que el worker está vivo.
Respuesta: `{"status":"ok","worker":"mariano-traductor"}`

### POST /translate
Traduce texto o imagen del alemán al español.
Content-Type: `multipart/form-data`

Campos:
- `image` — archivo JPEG (obligatorio si no hay `text`)
- `text` — string en alemán (obligatorio si no hay `image`)
- `context` — string opcional, pista de contexto en castellano

Si llegan `image` y `text` a la vez, gana `image`.

Respuesta exitosa:
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

Errores posibles:
- `401` — falta el header `x-api-token` o es incorrecto
- `400` — no se envió ni `image` ni `text`, o la imagen no es JPEG
- `502` — error en la llamada a Claude

---

## Lo que quiero construir

Una página o componente dentro del proyecto Eleventy con estas funcionalidades:

1. **Modo texto:** un textarea donde el usuario escribe o pega texto en alemán, pulsa "Traducir" y ve el resultado.
2. **Modo imagen:** un input de tipo file que acepta solo JPEG, previsualiza la imagen seleccionada y la envía al worker.
3. **Campo contexto:** un input de texto opcional visible en ambos modos.
4. **Resultado:** muestra `texto_original`, `texto_traducido` y los `fragmentos` en una tabla o lista. El campo `mariano` se muestra aparte, con un estilo diferente que transmita su personalidad (algo bronco, informal, divertido).
5. **Estados:** loading mientras espera respuesta, error si algo falla, vacío en el estado inicial.

## Restricciones técnicas

- Sin frameworks JS (nada de React, Vue, etc.). JavaScript vanilla únicamente.
- El `x-api-token` va en el código del frontend (es aceptable: es un token de acceso, no una clave secreta de pago).
- No instales dependencias npm solo para esto. Usa lo que Eleventy ya tiene o el navegador nativo (`fetch`, `FormData`).
- Si el proyecto usa Nunjucks o Liquid para las plantillas, intégralo de forma coherente con el resto.
- El estilo debe integrarse con el CSS existente del proyecto. Si no hay sistema de diseño definido, usa CSS sencillo sin librerías externas.

## Cómo debe llamar al worker (ejemplo de referencia)

```javascript
// Traducción de texto
async function translateText(text, context = '') {
  const formData = new FormData();
  formData.append('text', text);
  if (context) formData.append('context', context);

  const res = await fetch('https://mariano-traductor.victor-garcia-penyas.workers.dev/translate', {
    method: 'POST',
    headers: { 'x-api-token': '57102ab312c10e2383c6bc01ea2933ba' },
    body: formData,
  });

  return res.json();
}

// Traducción de imagen
async function translateImage(file, context = '') {
  const formData = new FormData();
  formData.append('image', file);
  if (context) formData.append('context', context);

  const res = await fetch('https://mariano-traductor.victor-garcia-penyas.workers.dev/translate', {
    method: 'POST',
    headers: { 'x-api-token': '57102ab312c10e2383c6bc01ea2933ba' },
    body: formData,
  });

  return res.json();
}
```

## Entrega esperada

- Un archivo de plantilla Eleventy (`.njk`, `.liquid` o `.html`) con el componente completo.
- El JavaScript puede ir inline en la plantilla o en un archivo separado en `/js/` o `/assets/js/` según la estructura del proyecto.
- El CSS puede ir inline o en el archivo de estilos existente.
- Si hay dudas sobre la estructura del proyecto Eleventy existente, pregunta antes de crear archivos.
