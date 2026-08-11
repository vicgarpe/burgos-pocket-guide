
---
layout: post.njk
title: "Título del post"
excerpt: "Resumen breve de lo que trata el post."
lugar: "Ubicación"
hero: "/images/nombre-de-la-imagen.jpg"
alt: "Texto alternativo de la imagen para accesibilidad"
templateEngineOverride: njk,md
permalink: /posts/{{ page.fileSlug }}/
---

## Reglas de la Estructura de los Posts

### Cabecera YAML (frontmatter)
Cada post debe incluir la siguiente cabecera al inicio del archivo Markdown (formato YAML):

```yaml
---
layout: post.njk
title: "Título del post"
excerpt: "Resumen breve de lo que trata el post."
lugar: "Ubicación"
hero: "/images/nombre-de-la-imagen.jpg"
alt: "Texto alternativo de la imagen para accesibilidad"
templateEngineOverride: njk,md
permalink: /posts/{{ page.fileSlug }}/
---
```

- **layout**: Debe ser `post.njk` para todos los posts.
- **title**: El título del post, generalmente relacionado con la fecha y tema.
- **excerpt**: Un resumen breve del post (máximo 2–3 líneas).
- **lugar**: El lugar principal de interés del post (puede ser una ciudad, una actividad, etc.).
- **hero**: Ruta a la imagen principal del post (imagen destacada, de tamaño adecuado).
- **alt**: Texto alternativo descriptivo de la imagen principal (para accesibilidad).
- **templateEngineOverride**: Se deja como `njk,md` para usar los shortcodes de Nunjucks y Markdown.
- **permalink**: Ruta final del post generada a partir del nombre del archivo. Usar la plantilla de ruta `/posts/{{ page.fileSlug }}/`.

### Estructura del Contenido
El cuerpo de cada post debe seguir esta estructura general:

1. **Título del post** (en la cabecera YAML).
2. **Qué ver**: Listado de actividades y puntos clave del día o tema.
3. **Reservas necesarias**: Detalle de las reservas que ya se han hecho o que deben hacerse.
4. **Timetable estimado**: Desglosado en tiempos orientativos (bloques de actividad).
5. **Tip luz solar**: Información sobre el amanecer y atardecer (hora local).
6. **Meteo (muy simple)**: Pronóstico a grandes rasgos para el día, con enlaces a webs locales.
7. **En el lugar**: Instrucciones sobre cómo llegar, qué ver, dónde comer y enlaces útiles.
8. **Historia**: Breve introducción histórica a los lugares mencionados, con enlaces a Wikipedia.
9. **Tareas pendientes**: Checklist de cosas que aún quedan por hacer (reserva, compra de billetes, etc.).

### Uso de Shortcodes
Utiliza los siguientes shortcodes para agregar mapas y coordenadas a tus posts:

- **Mapas de Google**:
  ```plaintext
  {% gmap "Texto del punto", "Descripción" %}
  {% gcoords lat, lon, "Etiqueta" %}
  ```
  Ejemplo:
  ```plaintext
  {% gmap "East Side Gallery, Berlin", "East Side Gallery (Maps)" %}
  {% gcoords 52.5050, 13.4396, "East Side Gallery — GPS" %}
  ```

### Hero Image
La **hero image** debe ser relevante para el contenido del post, y se debe utilizar en la cabecera YAML como una imagen destacada. La ruta debe ser accesible desde el servidor. Siempre asegúrate de que la imagen tenga un tamaño adecuado para la visualización en las vistas previas de los posts.

### Tareas Pendientes
Cada post debe terminar con una sección de **Tareas pendientes** o **Checklist**, que es un resumen de las decisiones clave o tareas que deben realizarse en el futuro para completar el viaje o actividad.

---

Este es un resumen básico de las reglas para estructurar los posts. Si necesitas que algún detalle sea más preciso o algún ajuste adicional, no dudes en pedirlo.
