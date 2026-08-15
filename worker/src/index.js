/**
 * burgos-finanzas — worker de finanzas del viaje.
 *
 * Guarda los gastos compartidos en un JSON de Dropbox y extrae los datos de los
 * tickets con Claude. Es una versión reducida del worker mariano-traductor del
 * viaje a Berlín: sin traducción y con la ruta de Dropbox elegida por viaje.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-token, X-App-Token',
};

const VALID_AGENTS = ['TV', 'MD', 'YM'];

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

// ── Viajes ───────────────────────────────────────────────────────────────────
// Cada viaje tiene su propio fichero, para que unas cuentas no se mezclen con
// otras. El frontend elige el suyo con ?viaje=<slug>.
//
// La ruta la decide el servidor a propósito: el token del worker acaba
// publicado en la web y las credenciales de Dropbox son de acceso total, así
// que si el navegador pudiera mandar una ruta libre, cualquiera con el token
// podría leer o sobrescribir cualquier fichero del Dropbox.
//
// Para añadir un viaje nuevo basta con una entrada más en esta tabla.
const VIAJES = {
  burgos: {
    path: '/Apps/burgos-finanzas/finanzas.json',
    tz:   'Europe/Madrid',
  },
};
const VIAJE_DEFAULT = 'burgos';

function resolveViaje(url) {
  const slug = (url.searchParams.get('viaje') || VIAJE_DEFAULT).toLowerCase();
  return VIAJES[slug] || null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

function hoy(tz) {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

async function callClaude(apiKey, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  return res.json();
}

// ── Dropbox helpers ──────────────────────────────────────────────────────────

async function dropboxAccessToken(env) {
  const res = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: env.DROPBOX_REFRESH_TOKEN,
      client_id: env.DROPBOX_APP_KEY,
      client_secret: env.DROPBOX_APP_SECRET,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dropbox token refresh error ${res.status}: ${err}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

async function dropboxRead(env, viaje) {
  const token = await dropboxAccessToken(env);
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: viaje.path }),
    },
  });
  // 409 = path_lookup/not_found → fichero inexistente, se inicializa vacío.
  // La carpeta tampoco hace falta crearla: la crea el upload.
  if (res.status === 409) {
    return { gastos: [], cancelaciones: [] };
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dropbox read error ${res.status}: ${err}`);
  }
  return res.json();
}

async function dropboxWrite(env, viaje, data) {
  const token = await dropboxAccessToken(env);
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: viaje.path, mode: 'overwrite' }),
      'Content-Type': 'application/octet-stream',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dropbox write error ${res.status}: ${err}`);
  }
}

// ── Finanzas handlers ────────────────────────────────────────────────────────

async function handleFinanzasGet(env, viaje) {
  const data = await dropboxRead(env, viaje);
  return jsonResponse(data);
}

async function handleGastoPost(request, env, viaje) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Body JSON inválido.');
  }

  const { descripcion, importe, pagador, participantes } = body;
  const fecha = body.fecha || hoy(viaje.tz);

  if (!descripcion || typeof descripcion !== 'string') {
    return errorResponse("Campo 'descripcion' requerido.");
  }
  if (typeof importe !== 'number' || importe <= 0) {
    return errorResponse("Campo 'importe' debe ser un número positivo.");
  }
  if (!VALID_AGENTS.includes(pagador)) {
    return errorResponse(`'pagador' debe ser uno de: ${VALID_AGENTS.join(', ')}.`);
  }
  if (!Array.isArray(participantes) || participantes.length < 2) {
    return errorResponse("'participantes' debe ser un array con al menos 2 elementos.");
  }
  if (participantes.some(p => !VALID_AGENTS.includes(p))) {
    return errorResponse(`'participantes' solo puede contener: ${VALID_AGENTS.join(', ')}.`);
  }
  if (!participantes.includes(pagador)) {
    return errorResponse("El 'pagador' debe estar incluido en 'participantes'.");
  }

  const gasto = {
    id: crypto.randomUUID(),
    fecha,
    descripcion,
    importe,
    pagador,
    participantes,
  };

  const data = await dropboxRead(env, viaje);
  data.gastos.push(gasto);
  await dropboxWrite(env, viaje, data);

  return jsonResponse(gasto, 201);
}

async function handleGastoDelete(id, env, viaje) {
  const data = await dropboxRead(env, viaje);
  const idx = data.gastos.findIndex(g => g.id === id);
  if (idx === -1) {
    return errorResponse('Gasto no encontrado.', 404);
  }
  data.gastos.splice(idx, 1);
  await dropboxWrite(env, viaje, data);
  return jsonResponse({ success: true });
}

async function handleCancelacionPost(request, env, viaje) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Body JSON inválido.');
  }

  const { de, a, importe } = body;
  const fecha = body.fecha || hoy(viaje.tz);
  const descripcion = body.descripcion || '';

  if (!VALID_AGENTS.includes(de)) {
    return errorResponse(`'de' debe ser uno de: ${VALID_AGENTS.join(', ')}.`);
  }
  if (!VALID_AGENTS.includes(a)) {
    return errorResponse(`'a' debe ser uno de: ${VALID_AGENTS.join(', ')}.`);
  }
  if (de === a) {
    return errorResponse("'de' y 'a' no pueden ser el mismo agente.");
  }
  if (typeof importe !== 'number' || importe <= 0) {
    return errorResponse("Campo 'importe' debe ser un número positivo.");
  }

  const cancelacion = {
    id: crypto.randomUUID(),
    fecha,
    de,
    a,
    importe,
    descripcion,
  };

  const data = await dropboxRead(env, viaje);
  data.cancelaciones.push(cancelacion);
  await dropboxWrite(env, viaje, data);

  return jsonResponse(cancelacion, 201);
}

async function handleCancelacionDelete(id, env, viaje) {
  const data = await dropboxRead(env, viaje);
  const idx = data.cancelaciones.findIndex(c => c.id === id);
  if (idx === -1) {
    return errorResponse('Cancelación no encontrada.', 404);
  }
  data.cancelaciones.splice(idx, 1);
  await dropboxWrite(env, viaje, data);
  return jsonResponse({ success: true });
}

// ── OCR de tickets ───────────────────────────────────────────────────────────
// No guarda nada, así que no depende del viaje.

async function handleOcr(request, env) {
  let base64;
  let mediaType = 'image/jpeg';

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse('No se pudo leer el formulario multipart.');
    }
    const file = formData.get('imagen');
    if (!file) {
      return errorResponse("Campo 'imagen' requerido en el formulario.");
    }
    mediaType = file.type || 'image/jpeg';
    const buf = await file.arrayBuffer();
    const uint8 = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    base64 = btoa(binary);
  } else {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Body JSON inválido. Envía multipart/form-data con campo "imagen" o JSON con "imagen_b64".');
    }
    if (!body.imagen_b64) {
      return errorResponse("Campo 'imagen_b64' requerido en el JSON.");
    }
    base64 = body.imagen_b64;
    if (body.media_type) mediaType = body.media_type;
  }

  const ocrPrompt = `Analiza esta imagen de un ticket o factura y extrae los siguientes datos.

Responde ÚNICAMENTE con este JSON sin texto adicional ni backticks:
{
  "fecha": "<fecha del ticket en formato YYYY-MM-DD, o null si no se puede determinar>",
  "importe": <importe total como número decimal, o null si no se puede determinar>,
  "descripcion": "<nombre del establecimiento o concepto breve, o null>",
  "confiabilidad_ocr": "<notas sobre la calidad del OCR y fiabilidad de los datos extraídos>"
}

Instrucciones:
- Para 'importe': busca el total/importe mayor del ticket (normalmente etiquetado como Total, Suma, Importe, etc.)
- Para 'fecha': busca la fecha de emisión del ticket
- Para 'descripcion': nombre del comercio, restaurante, tienda u otro concepto breve
- Para 'confiabilidad_ocr': indica si la imagen es clara, si hay partes ilegibles, si estás seguro de los valores, etc.
- Si no puedes extraer un valor con razonable confianza, usa null`;

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: ocrPrompt,
        },
      ],
    },
  ];

  let claudeData;
  try {
    claudeData = await callClaude(env.ANTHROPIC_API_KEY, messages);
  } catch (err) {
    return errorResponse(`Error al llamar a Claude: ${err.message}`, 502);
  }

  const rawContent = claudeData.content?.[0]?.text || '';

  let parsed;
  try {
    const clean = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    return errorResponse(`La respuesta de Claude no era JSON válido: ${rawContent}`, 502);
  }

  return jsonResponse({
    fecha: parsed.fecha ?? null,
    importe: parsed.importe ?? null,
    descripcion: parsed.descripcion ?? null,
    confiabilidad_ocr: parsed.confiabilidad_ocr ?? null,
  });
}

// ── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const { pathname } = url;
      const method = request.method;

      // Preflight CORS
      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      // ── Autenticación (todas las rutas) ────────────────────────────
      const token = request.headers.get('x-api-token');
      if (token !== env.API_TOKEN) {
        return errorResponse('No autorizado.', 401);
      }

      if (pathname === '/health' && method === 'GET') {
        return jsonResponse({
          status: 'ok',
          worker: 'burgos-finanzas',
          viajes: Object.keys(VIAJES),
        });
      }

      // ── Rutas de finanzas ───────────────────────────────────────────
      if (pathname.startsWith('/finanzas')) {
        // El OCR no toca el almacenamiento, así que no necesita viaje.
        if (pathname === '/finanzas/ocr' && method === 'POST') {
          return handleOcr(request, env);
        }

        const viaje = resolveViaje(url);
        if (!viaje) {
          return errorResponse(
            `Viaje desconocido. Viajes válidos: ${Object.keys(VIAJES).join(', ')}.`
          );
        }

        if (pathname === '/finanzas' && method === 'GET') {
          return handleFinanzasGet(env, viaje);
        }
        if (pathname === '/finanzas/gasto' && method === 'POST') {
          return handleGastoPost(request, env, viaje);
        }
        if (pathname.startsWith('/finanzas/gasto/') && method === 'DELETE') {
          const id = pathname.replace('/finanzas/gasto/', '');
          if (!id) return errorResponse('ID de gasto requerido.', 400);
          return handleGastoDelete(id, env, viaje);
        }
        if (pathname === '/finanzas/cancelacion' && method === 'POST') {
          return handleCancelacionPost(request, env, viaje);
        }
        if (pathname.startsWith('/finanzas/cancelacion/') && method === 'DELETE') {
          const id = pathname.replace('/finanzas/cancelacion/', '');
          if (!id) return errorResponse('ID de cancelación requerido.', 400);
          return handleCancelacionDelete(id, env, viaje);
        }

        return errorResponse('Ruta no encontrada.', 404);
      }

      return errorResponse('Ruta no encontrada.', 404);
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};
