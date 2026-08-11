---
layout: post.njk
title: "Meteorología — Berlín, marzo 2026"
excerpt: "Previsión del tiempo para los días del viaje, actualizada en tiempo real con Open-Meteo."
modulo: "Recursos"
hero: "/images/berlin-hero-1200.jpg"
alt: "Cielo sobre Berlín"
templateEngineOverride: njk,md
permalink: /recursos/recursos_meteo/
---

Previsión actualizada al abrir esta página. Sin API key — datos libres de [Open-Meteo](https://open-meteo.com/) (Berlín, 52.52°N 13.41°E).

<div id="meteo-widget">
  <p class="text-muted">Cargando previsión…</p>
</div>

## Otras fuentes

- [Weatherspark — Berlín en marzo](https://es.weatherspark.com/m/75981/3/Tiempo-promedio-en-marzo-en-Berl%C3%ADn-Alemania)
- [Meteoblue — semana](https://www.meteoblue.com/es/tiempo/semana/berl%C3%ADn_alemania_2950159)
- [Meteoblue — 14 días](https://www.meteoblue.com/es/tiempo/14-dias/berl%C3%ADn_alemania_2950159)
- [Windy (visual, en español)](https://www.windy.com/es/)

<script>
(async () => {
  const TRIP = [
    { date: "2026-03-18", label: "Mié 18 · Llegada" },
    { date: "2026-03-19", label: "Jue 19 · Muro / Tours" },
    { date: "2026-03-20", label: "Vie 20 · Sachsenhausen" },
    { date: "2026-03-21", label: "Sáb 21 · Mañana suave" },
    { date: "2026-03-22", label: "Dom 22 · Vuelo 06:00" }
  ];

  const WMO_DESC = {
    0:"Despejado", 1:"Mayormente despejado", 2:"Parcialmente nublado", 3:"Nublado",
    45:"Niebla", 48:"Niebla con escarcha",
    51:"Llovizna ligera", 53:"Llovizna", 55:"Llovizna intensa",
    61:"Lluvia ligera", 63:"Lluvia", 65:"Lluvia intensa",
    71:"Nieve ligera", 73:"Nieve", 75:"Nieve intensa", 77:"Granizo",
    80:"Chubascos", 81:"Chubascos", 82:"Chubascos fuertes",
    85:"Nieve en chubascos", 86:"Nieve intensa",
    95:"Tormenta", 96:"Tormenta con granizo", 99:"Tormenta"
  };
  const WMO_ICON = {
    0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 48:"🌫️",
    51:"🌦️", 53:"🌦️", 55:"🌧️", 61:"🌧️", 63:"🌧️", 65:"🌧️",
    71:"❄️", 73:"❄️", 75:"❄️", 77:"🌨️", 80:"🌦️", 81:"🌧️", 82:"⛈️",
    85:"🌨️", 86:"🌨️", 95:"⛈️", 96:"⛈️", 99:"⛈️"
  };

  const widget = document.getElementById("meteo-widget");

  try {
    const url = "https://api.open-meteo.com/v1/forecast"
      + "?latitude=52.52&longitude=13.41"
      + "&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max"
      + "&timezone=Europe%2FBerlin&forecast_days=16";

    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();

    const times = data.daily.time;
    const rows = TRIP.map(({ date, label }) => {
      const i = times.indexOf(date);
      if (i === -1) return null;
      return {
        label,
        code:  data.daily.weathercode[i],
        max:   Math.round(data.daily.temperature_2m_max[i]),
        min:   Math.round(data.daily.temperature_2m_min[i]),
        rain:  (data.daily.precipitation_sum[i] ?? 0).toFixed(1),
        wind:  Math.round(data.daily.windspeed_10m_max[i])
      };
    }).filter(Boolean);

    if (rows.length === 0) {
      widget.innerHTML = '<p class="text-muted">La previsión aún no cubre las fechas del viaje. Vuelve a consultar más cerca del 18 de marzo.</p>';
      return;
    }

    const cards = rows.map(d => `
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="card meteo-card h-100">
          <div class="card-body">
            <div class="meteo-icon">${WMO_ICON[d.code] ?? "🌡️"}</div>
            <h3 class="meteo-day">${d.label}</h3>
            <p class="meteo-desc">${WMO_DESC[d.code] ?? "—"}</p>
            <p class="meteo-temps">
              <span class="meteo-max">${d.max}°</span>
              <span class="meteo-min">${d.min}°</span>
            </p>
            <p class="meteo-detail">💧 ${d.rain} mm &nbsp;·&nbsp; 💨 ${d.wind} km/h</p>
          </div>
        </div>
      </div>`).join("");

    widget.innerHTML = `
      <div class="row g-3 mb-3">${cards}</div>
      <p class="text-muted small">
        Actualizado: ${new Date().toLocaleString("es-ES")} ·
        Fuente: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>
      </p>`;

  } catch {
    widget.innerHTML = '<p class="text-danger small">No se pudo cargar la previsión. Comprueba la conexión e intenta recargar la página.</p>';
  }
})();
</script>
