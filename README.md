# Berlin Pocket Guide — Guía del autor

Guía de viaje estática generada con [Eleventy](https://www.11ty.dev/), desplegada en GitHub Pages.

- **URL producción:** `https://vicgarpe.github.io/berlin-poket-guide/`
- **Rama de trabajo:** `desarrollo`
- **Rama de producción:** `main`

---

## Despliegue

El sitio se despliega automáticamente en GitHub Pages al hacer push a `main`.

```bash
# Probar en local
npm run serve          # http://localhost:8080/berlin-poket-guide/

# Cuando esté listo: commit, merge y push a main
git checkout main
git merge desarrollo
git push origin main
git checkout desarrollo
```

---

## Estructura de posts

Todos los posts viven en `src/posts/`. El prefijo del fichero determina el módulo:

| Prefijo | Módulo | URL generada |
|---|---|---|
| `YYYY-MM-DD-*.md` | Agenda | `/posts/slug/` |
| `historia_*.md` | Historia | `/historia/slug/` |
| `recursos_*.md` | Recursos | `/recursos/slug/` |

---

## Módulo Agenda — fichas de día

Frontmatter mínimo:

```yaml
---
layout: post.njk
title: "Día N — Título"
excerpt: "Descripción breve."
lugar: "Berlín"
hero: "/images/nombre.jpg"
alt: "Descripción de la imagen"
templateEngineOverride: njk,md
permalink: /posts/{{ page.fileSlug }}/
---
```

### Widget Timeline

Coloca el shortcode justo después del frontmatter para mostrar la línea de tiempo del día:

```
{% timeline "YYYY-MM-DD" %}
```

El widget lee automáticamente la sección `## Timetable estimado` del propio post y construye la línea de tiempo. No requiere datos adicionales.

**Formato del timetable:**

```markdown
## Timetable estimado (orientativo)

- **09:20** — Salida desde el hotel          ← hito puntual (punto en el eje)
- **10:00–12:30 · Free tour Berlín**         ← evento con duración (barra)
- **12:30–13:30** — Comida / descanso        ← evento con duración (barra)
- 13:50 — Despegue VLC                       ← hito sin negrita (también válido)
```

Reglas de parseo:
- `HH:MM–HH:MM` → **evento con duración** → barra coloreada en carril Gantt
- `HH:MM` solo → **hito puntual** → línea discontinua vertical en zona inferior
- Los eventos solapados suben de carril automáticamente (layout tipo Gantt)
- Las barras alternan entre dos estilos: sólido y outline
- Si la fecha coincide con hoy: línea roja de "ahora" + auto-scroll al momento actual
- Al tocar/clicar un evento en móvil aparece un popup con la hora y el nombre

---

## Módulo Historia — fichas de contexto

```yaml
---
layout: post.njk
title: "Título"
excerpt: "Descripción breve."
modulo: "Historia"
hero: "/images/nombre.jpg"
alt: "..."
templateEngineOverride: njk,md
permalink: /historia/historia_slug/
---
```

---

## Módulo Recursos — fichas de referencia

```yaml
---
layout: post.njk
title: "Título"
excerpt: "Descripción breve."
modulo: "Recursos"
templateEngineOverride: njk,md
permalink: /recursos/recursos_slug/
---
```

---

## Módulo Galería (`/galeria/`)

Galería de fotos y vídeos almacenados en Dropbox. Acceso protegido con contraseña.

**Funcionalidades:**
- Carga automática desde la carpeta Dropbox configurada en `.env`
- Miniaturas en layout masonry (3 columnas escritorio, 2 móvil)
- **Agrupación:** selector `[Día] [Cámara] [Tipo]` sobre el grid
  - **Día:** agrupa por fecha de captura, orden cronológico
  - **Cámara:** lee `Make`/`Model` EXIF del fichero (primeros 64 KB, lotes de 8 en paralelo); se cachea en sesión para cambios instantáneos posteriores
  - **Tipo:** Fotos primero, Vídeos después
- **Lightbox:** visualización a pantalla completa con navegación por gestos y teclado
  - Doble tap en el pie de foto → overlay EXIF completo (fecha, resolución, cámara, exposición, ISO, GPS con enlace a Google Maps)
- **Modo selección:** long press (500 ms) para entrar; selección múltiple; descarga de archivos seleccionados con barra de progreso
  - El selector de agrupación desaparece en modo selección y reaparece al salir
- **Subida:** botón "Subir" con soporte de múltiples archivos y sesiones chunked para ficheros > 150 MB

**Variables de entorno requeridas** (en `.env` y en GitHub Secrets):
```
DROPBOX_APP_KEY
DROPBOX_APP_SECRET
DROPBOX_REFRESH_TOKEN
```

---

## Módulo Traductor (`/traductor/`)

Traduce texto o imagen (OCR) del alemán al español via Cloudflare Worker. Acceso protegido.

**Funcionalidades:**
- Modo texto: pegar o escribir alemán → traducción con notas contextuales de Mariano
- Modo foto: capturar o subir imagen → OCR + traducción
- Campo de contexto opcional (p.ej. "menú de restaurante", "señal de tráfico")
- Resultado estructurado: traducción principal + tabla de fragmentos + nota cultural

**Variable de entorno requerida:**
```
WORKER_TOKEN
```

---

## Módulo Finanzas (`/finanzas/`)

Registro y balance de gastos del viaje entre los participantes (TV, MD, YM). Acceso protegido.

**Funcionalidades:**
- **Balance visual:** 3 filas (una por par central) con flechas de dirección de deuda y importes
- **Movimientos:** lista cronológica de gastos y cancelaciones, todos eliminables
- **Añadir gasto:** descripción, importe, fecha, pagador y participantes; opcionalmente mediante OCR de ticket (foto → Worker → campos prellenados)
- **Cancelación de deuda:** registro de pagos directos entre participantes
- Datos almacenados y servidos por el Cloudflare Worker

**Variable de entorno requerida:**
```
WORKER_TOKEN
```

---

## Sistema de autenticación unificado

Los tres módulos de aplicación (Galería, Traductor, Finanzas) están protegidos por un gate de contraseña compartido.

### Cómo funciona

- Una sola contraseña desbloquea todos los módulos
- La sesión dura 30 días (cookie `viaje_ok`)
- Si ya estás autenticado, los módulos cargan directamente sin mostrar el gate

### Shortcode `{% gate %}...{% endgate %}`

Para proteger cualquier módulo o widget con el gate unificado:

```nunjucks
{% gate %}
  ... contenido del módulo ...
{% endgate %}
```

Genera automáticamente la pantalla de contraseña y envuelve el contenido. Al autenticarse correctamente se disparan dos eventos globales:

| Evento | Cuándo |
|---|---|
| `viaje:authed` | Al cargar la página si la cookie ya existe |
| `viaje:unlocked` | Justo después de introducir la contraseña correctamente |

Los módulos que necesitan inicialización tras auth escuchan estos eventos:

```javascript
document.addEventListener('viaje:authed',   inicializar);
document.addEventListener('viaje:unlocked', inicializar);
```

### Cambiar la contraseña

En `src/_includes/base.njk`, busca:

```javascript
var PWD = 'bollagas';
```

---

## Shortcodes disponibles

### `{% gmap "query", "etiqueta" %}`
Enlace a Google Maps por búsqueda de texto.
```
{% gmap "Rotes Rathaus, Berlin", "Punto de encuentro — Rotes Rathaus" %}
```

### `{% gcoords lat, lon, "etiqueta" %}`
Enlace a Google Maps por coordenadas GPS.
```
{% gcoords 52.5186, 13.4081, "Rotes Rathaus — GPS" %}
```

### `{% wiki "slug", "etiqueta" %}`
Enlace interno entre fichas por nombre de fichero (sin extensión). Resuelve la URL según el prefijo del slug.
```
{% wiki "recursos_meteo", "→ Previsión meteorológica" %}
{% wiki "historia_muro", "El Muro de Berlín" %}
{% wiki "2026-03-19-muro-monumental", "Día 1" %}
```

### `{% timeline "YYYY-MM-DD" %}`
Widget de línea de tiempo del día. Ver sección Módulo Agenda.

### `{% traductor "Etiqueta" %}`
Botón que enlaza al módulo Traductor.
```
{% traductor "Abrir Mariano..." %}
```

### `{% finanzas "Etiqueta" %}`
Botón que enlaza al módulo Finanzas.
```
{% finanzas "Ver gastos del viaje" %}
```

### `{% gate %}...{% endgate %}`
Envuelve contenido con el gate de autenticación compartido. Ver sección anterior.

---

## Widget TTS — pronunciación en alemán

En cualquier tabla con columna `Alemán` (cabecera exacta), cada celda añade automáticamente un icono ▶ clicable. Al pulsar, el navegador pronuncia la frase en alemán (Web Speech API, sin conexión necesaria). No requiere configuración.

---

## Filtros de fecha

```
{{ page.date | formatDate('es-ES') }}      → "18 mar 2026"
{{ page.date | formatDateFull('es-ES') }}  → "miércoles — 18 mar 2026"
```

---

## Variables de entorno

Todas se definen en `.env` (local) y en GitHub Secrets (producción). Se inyectan en build-time:

| Variable | Uso |
|---|---|
| `WORKER_TOKEN` | Token de autenticación para el Cloudflare Worker (Traductor + Finanzas) |
| `DROPBOX_APP_KEY` | App Key de la aplicación Dropbox |
| `DROPBOX_APP_SECRET` | App Secret de la aplicación Dropbox |
| `DROPBOX_REFRESH_TOKEN` | Refresh token OAuth2 de Dropbox |
