# burgos-finanzas — worker de finanzas del viaje

Cloudflare Worker que da servicio al módulo **Finanzas** de la guía
(`src/finanzas.njk` → `/finanzas/`). Hace dos cosas:

- **Guardar las cuentas compartidas** en un JSON dentro de Dropbox.
- **Leer los tickets** con Claude para prerrellenar el formulario de gasto.

Es una versión reducida del worker `mariano-traductor` del viaje a Berlín: sin
traducción, y con la ruta de Dropbox elegida por viaje. Aquel sigue desplegado y
sirviendo a la guía de Berlín; este no lo toca.

## Por qué un worker aparte

`mariano-traductor` escribe siempre en el mismo fichero fijo
(`/Apps/berlin-finanzas/finanzas.json`), así que las dos guías compartirían
cuentas: los gastos de Berlín aparecerían en Burgos y cualquiera podría
borrarlos desde la guía equivocada.

## Viajes

Cada viaje tiene su propio fichero. El frontend elige el suyo con `?viaje=<slug>`
y el worker traduce ese slug a una ruta con la tabla `VIAJES` de `src/index.js`:

| slug | fichero en Dropbox | zona horaria |
|---|---|---|
| `burgos` (por defecto) | `/Apps/burgos-finanzas/finanzas.json` | `Europe/Madrid` |

Un slug que no esté en la tabla devuelve 400. **La ruta la decide siempre el
servidor, nunca el navegador**: el token del worker acaba publicado en la web y
las credenciales de Dropbox son de acceso total, así que aceptar una ruta libre
del cliente permitiría leer o sobrescribir cualquier fichero del Dropbox.

Para añadir un viaje: una entrada más en `VIAJES` y volver a desplegar.

## Endpoints

Todos piden el header `x-api-token: $API_TOKEN`. Las rutas de datos aceptan
`?viaje=`; el OCR no lo necesita porque no guarda nada.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/health` | Comprobación, devuelve los viajes configurados |
| `GET` | `/finanzas` | `{ gastos: [...], cancelaciones: [...] }` |
| `POST` | `/finanzas/gasto` | Añade un gasto |
| `DELETE` | `/finanzas/gasto/:id` | Borra un gasto |
| `POST` | `/finanzas/cancelacion` | Registra un pago entre parejas |
| `DELETE` | `/finanzas/cancelacion/:id` | Borra una cancelación |
| `POST` | `/finanzas/ocr` | Extrae fecha, importe y concepto de un ticket |

Los agentes válidos son `TV`, `MD` e `YM` (las tres parejas). El detalle de cada
payload está en `prompts/55-finanzas-frontend.md`, en la raíz del repo.

## Desarrollo y despliegue

```bash
cp .dev.vars.example .dev.vars   # y rellenar los cinco valores
npm run dev                      # wrangler dev en local
npm run deploy                   # wrangler deploy + subida de secretos
```

`.dev.vars` está en `.gitignore`. Los secretos que necesita el worker son
`ANTHROPIC_API_KEY`, `API_TOKEN` y las tres `DROPBOX_*`. `API_TOKEN` tiene que
coincidir con `WORKER_TOKEN` en el `.env` de la web y en los secretos del repo
de GitHub.

## Modelo

El OCR usa `claude-haiku-4-5` (`MODEL` en `src/index.js`): es barato y le sobra
para leer un ticket.
