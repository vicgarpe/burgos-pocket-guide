/**
 * Post-build: cifra _site/traductor/index.html con AES-256-GCM
 * y lo reemplaza por una página shell con formulario de contraseña.
 */

import { readFileSync, writeFileSync } from 'fs';
import { createCipheriv, randomBytes, pbkdf2Sync } from 'crypto';

const PASSWORD   = 'bollagas';
const REDIRECT   = '/berlin-poket-guide/';
const INPUT      = '_site/traductor/index.html';
const ITERATIONS = 250_000;

const plaintext = readFileSync(INPUT, 'utf-8');

const salt = randomBytes(16);
const key  = pbkdf2Sync(PASSWORD, salt, ITERATIONS, 32, 'sha256');
const iv   = randomBytes(12);

const cipher = createCipheriv('aes-256-gcm', key, iv);
const enc    = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
const tag    = cipher.getAuthTag();

const payload = JSON.stringify({
  s: salt.toString('base64'),
  i: iv.toString('base64'),
  t: tag.toString('base64'),
  c: enc.toString('base64')
});

writeFileSync(INPUT, buildShell(payload, ITERATIONS, REDIRECT), 'utf-8');
console.log('✓ traductor/index.html — cifrada con AES-256-GCM');

// ─────────────────────────────────────────────────────────────────────────────

function buildShell(payloadJSON, iterations, redirect) {
  const safePayload = payloadJSON.replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Traductor — Guía de Berlín</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100svh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fbfaf7;
      font-family: "Libre Franklin", system-ui, sans-serif;
    }
    .card {
      width: min(100%, 320px);
      padding: 2.25rem 2rem;
      background: #fff;
      border: 1px solid #e7e1d7;
      border-radius: .75rem;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #9b3221;
      letter-spacing: -.01em;
      margin: 0 0 1.5rem;
      text-align: center;
    }
    input[type=password] {
      width: 100%;
      border: 1px solid #e7e1d7;
      border-radius: .5rem;
      padding: .7rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      outline: none;
      background: #fff;
      transition: border-color .15s, box-shadow .15s;
    }
    input[type=password]:focus {
      border-color: #9b3221;
      box-shadow: 0 0 0 3px rgba(155,50,33,.15);
    }
    button {
      width: 100%;
      margin-top: .75rem;
      padding: .7rem 1rem;
      background: #bb3825;
      color: #fff;
      border: none;
      border-radius: .5rem;
      font-size: 1rem;
      font-weight: 700;
      font-family: inherit;
      letter-spacing: .02em;
      cursor: pointer;
      transition: background .15s;
    }
    button:hover { background: #9b3221; }
    button:disabled { opacity: .6; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Traductor</h1>
    <input id="pw" type="password" placeholder="Contraseña" autocomplete="current-password" autofocus>
    <button id="btn" type="button">Entrar</button>
  </div>

  <script type="application/json" id="payload">${safePayload}</script>
  <script>
    const _TK = 'bgp_gal';
    const _TTL = 30 * 24 * 60 * 60 * 1000;

    function b64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

    async function tryDecrypt(password) {
      const p   = JSON.parse(document.getElementById('payload').textContent);
      const enc = new TextEncoder();
      const mat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: b64(p.s), iterations: ${iterations}, hash: 'SHA-256' },
        mat,
        { name: 'AES-GCM', length: 256 }, false, ['decrypt']
      );
      const ct  = b64(p.c);
      const tag = b64(p.t);
      const buf = new Uint8Array(ct.length + tag.length);
      buf.set(ct); buf.set(tag, ct.length);
      const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(p.i) }, key, buf);
      return new TextDecoder().decode(dec);
    }

    async function onSubmit() {
      const btn = document.getElementById('btn');
      btn.disabled = true; btn.textContent = '…';
      try {
        const pw = document.getElementById('pw').value.trim();
        const html = await tryDecrypt(pw);
        try { localStorage.setItem(_TK, JSON.stringify({ pw, exp: Date.now() + _TTL })); } catch {}
        document.open(); document.write(html); document.close();
      } catch {
        window.location.replace('${redirect}');
      }
    }

    document.getElementById('btn').addEventListener('click', onSubmit);
    document.getElementById('pw').addEventListener('keydown', e => { if (e.key === 'Enter') onSubmit(); });

    // Auto-login si hay token guardado
    (async () => {
      try {
        const raw = localStorage.getItem(_TK);
        if (!raw) return;
        const { pw, exp } = JSON.parse(raw);
        if (!pw || exp < Date.now()) { localStorage.removeItem(_TK); return; }
        const card = document.querySelector('.card');
        if (card) card.style.opacity = '0.4';
        const html = await tryDecrypt(pw);
        document.open(); document.write(html); document.close();
      } catch {
        localStorage.removeItem(_TK);
        const card = document.querySelector('.card');
        if (card) card.style.opacity = '1';
      }
    })();
  </script>
</body>
</html>`;
}
