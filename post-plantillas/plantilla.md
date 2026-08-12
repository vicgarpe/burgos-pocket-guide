---
layout: post.njk
title: "Día # — TITULO"
excerpt: "Pequeña descripción de la actividad"
lugar: "Burgos"
hero: "/images/nombre-800.jpg"   # 👈 Esta imagen será el hero del post y la miniatura en portada
alt: "describe la imagen"
# (opcional) para usar shortcodes Nunjucks dentro del Markdown:
templateEngineOverride: njk,md
permalink: /posts/{{ page.fileSlug }}/
---

## Qué ver
- Catedral de Santa María
- Mirador del Castillo

![Paseo por el Espolón](/images/nombre-1200.jpg)

## Reservas necesarias
Todas las reservas y enlaces necesarios.

## En el lugar

### Dónde comer
- [Nombre del sitio](https://ejemplo.com) — nota breve.

### Cómo llegar
- A pie desde el casco histórico / coche.

Para poner los enlaces a gmaps hacemos esto

{% gmap "Catedral de Burgos", "Catedral en Maps" %}

{% gcoords 42.3409, -3.7044, "Catedral — GPS" %}

## Un poco de historia
Marco histórico del emplazamiento.
