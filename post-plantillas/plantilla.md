---
layout: post.njk
title: "Día # — TITULO"
excerpt: "Pequeña descripción de la actividad"
lugar: "Berlín"
hero: "/images/kreuzberg-1200.jpg"   # 👈 Esta imagen será el hero del post y la miniatura en portada
alt: "describe la imagen"
# (opcional) para usar shortcodes Nunjucks dentro del Markdown:
templateEngineOverride: njk,md
---

## Qué ver
- East Side Gallery
- Maybachufer

![Paseo por el canal](/images/canal-berlin-1200.jpg)

## Reservas necesarias
Todas las reservas y enlaces necesarios.

## En el lugar

### Dónde comer
- [Mustafa's Gemüse Kebap](https://ejemplo.com) — cola, pero merece la pena.

### Cómo llegar
- U1 / U8 → Görlitzer Bahnhof.

Para poner los enlaces a gmpas hacemos esto

{% gmap "Mustafa's Gemüse Kebap, Berlin", "Kebap en Maps" %}

{% gcoords 52.5006, 13.4410, "Canal en Maps" %}

## Un poco de historia
Marco historico del emplazamiento.
