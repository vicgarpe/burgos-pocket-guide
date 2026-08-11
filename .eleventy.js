import 'dotenv/config';
const PATH_PREFIX = "/berlin-poket-guide/";

export default function(eleventyConfig) {
  // --- Passthrough de estáticos ---
  // Soporta ambas rutas por si usas "imagenes" o "images"
  eleventyConfig.addPassthroughCopy({ "src/imagenes": "imagenes" });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/styles.css": "styles.css" });

  // --- Colecciones por módulo ---
  // Agenda: posts con fecha (YYYY-MM-DD-*.md)
  eleventyConfig.addCollection("agenda", (api) =>
    api.getFilteredByGlob("src/posts/[0-9]*.md").sort((a, b) => a.date - b.date)
  );
  // Historia: fichas historia_*.md
  eleventyConfig.addCollection("historia", (api) =>
    api.getFilteredByGlob("src/posts/historia_*.md")
  );
  // Recursos: fichas recursos_*.md
  eleventyConfig.addCollection("recursos", (api) =>
    api.getFilteredByGlob("src/posts/recursos_*.md")
  );

  // --- Filtro de fecha para Nunjucks: {{ fecha | formatDate('es-ES') }} ---
  eleventyConfig.addFilter("formatDate", (dateObj, locale = "es-ES", opts) => {
    const options = opts || { day: "2-digit", month: "short", year: "numeric" };
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  });

  // --- Filtro de fecha con día de la semana: "miércoles — 18 mar 2026" ---
  eleventyConfig.addFilter("formatDateFull", (dateObj, locale = "es-ES") => {
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(dateObj);
    const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(dateObj);
    return `${weekday} — ${date}`;
  });

  // --- Dato global (año de build) para usar en plantillas ---
  eleventyConfig.addGlobalData("build", { year: new Date().getFullYear() });

  // --- Token worker Mariano (desde .env / GitHub Secret) ---
  eleventyConfig.addGlobalData("workerToken", process.env.WORKER_TOKEN || "");

  // --- Credenciales Dropbox (desde .env, solo se incrustan en galeria.njk) ---
  eleventyConfig.addGlobalData("dropbox", {
    appKey:       process.env.DROPBOX_APP_KEY       || "",
    appSecret:    process.env.DROPBOX_APP_SECRET    || "",
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN || "",
    folder:       "/Almacen-archivo/2026-berlin"
  });

  // --- Shortcodes Nunjucks para Google Maps ---
  const _escapeHtml = (str = "") =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  eleventyConfig.addNunjucksShortcode("gmap", (q, label) => {
    const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    const txt = _escapeHtml(label || "Ver en Google Maps");
    return `<a class="map-link" href="${url}" target="_blank" rel="noopener noreferrer"><span class="map-tag" aria-hidden="true">MAPS</span><span class="map-link-text">${txt}</span></a>`;
  });

  eleventyConfig.addNunjucksShortcode("gcoords", (lat, lon, label) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
    const txt = _escapeHtml(label || "Ver en Google Maps");
    return `<a class="map-link" href="${url}" target="_blank" rel="noopener noreferrer"><span class="map-tag" aria-hidden="true">MAPS</span><span class="map-link-text">${txt}</span></a>`;
  });

  // --- Shortcode finanzas: botón que enlaza al módulo de finanzas ---
  eleventyConfig.addNunjucksShortcode("finanzas", (label) => {
    const txt  = _escapeHtml(label || "Abrir Finanzas");
    const href = PATH_PREFIX + "finanzas/";
    return `<a class="gallery-upload-btn" href="${href}">
  <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.12-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z"/>
  </svg>
  ${txt}</a>`;
  });

  // --- Shortcode traductor: botón que enlaza al módulo de traducción ---
  eleventyConfig.addNunjucksShortcode("traductor", (label) => {
    const txt = _escapeHtml(label || "Abrir traductor");
    const href = PATH_PREFIX + "traductor/";
    return `<a class="gallery-upload-btn" href="${href}">
  <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z"/>
    <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm7.138 9.995c.193.301.402.583.63.846-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14v-.995h-3v-.995h-1v.995H7v.995h.517c.394 1.059.949 1.95 1.621 2.663z"/>
  </svg>
  ${txt}</a>`;
  });

  // --- Shortcode timeline: línea de tiempo del día (widgets de agenda) ---
  eleventyConfig.addNunjucksShortcode("timeline", (date) => {
    return `<div class="timeline-widget" data-date="${_escapeHtml(date || '')}"></div>`;
  });

  // --- Shortcode wiki: [[slug]] enlaza entre fichas por nombre de fichero ---
  eleventyConfig.addNunjucksShortcode("wiki", (slug, label) => {
    slug = slug.replace(/\.md$/, "");
    let path;
    if (/^\d{4}-\d{2}-\d{2}-/.test(slug)) {
      path = `posts/${slug.replace(/^\d{4}-\d{2}-\d{2}-/, "")}/`;
    } else if (slug.startsWith("historia_")) {
      path = `historia/${slug}/`;
    } else if (slug.startsWith("recursos_")) {
      path = `recursos/${slug}/`;
    } else {
      path = `posts/${slug}/`;
    }
    const href = PATH_PREFIX + path;
    const txt = _escapeHtml(label || slug);
    return `<a href="${href}" class="wiki-link">${txt}</a>`;
  });

  // --- Shortcode gate: envuelve módulos privados con pantalla de contraseña ---
  eleventyConfig.addPairedNunjucksShortcode("gate", function(content) {
    return '<div data-gate>' +
      '<div data-gate-screen class="viaje-gate">' +
        '<div class="viaje-gate-inner">' +
          '<svg width="32" height="32" fill="var(--accent)" viewBox="0 0 16 16" aria-hidden="true" class="mb-3">' +
            '<path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>' +
          '</svg>' +
          '<p class="viaje-gate-label">Área privada</p>' +
          '<input type="password" class="viaje-gate-input" placeholder="Contraseña"' +
                 ' autocomplete="off" aria-label="Contraseña de acceso"' +
                 ' onkeydown="if(event.key===\'Enter\')viajeAuth.check(this)">' +
          '<button class="gallery-upload-btn viaje-gate-btn" onclick="viajeAuth.check(this)">Entrar</button>' +
        '</div>' +
      '</div>' +
      '<div data-gate-content class="d-none">' +
        content +
      '</div>' +
    '</div>';
  });

  // --- Directorios + pathPrefix para GitHub Pages (repo de proyecto) ---
  return {
    dir: { input: "src", output: "_site", includes: "_includes" },
    pathPrefix: PATH_PREFIX
  };
}
