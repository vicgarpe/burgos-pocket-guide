Trabajamos en la guía de viaje a Berlín construida con Eleventy.
El proyecto está desplegado en GitHub Pages.

Quiero añadir un módulo de galería al proyecto existente.
Revisa primero la estructura actual antes de proponer nada.

## Módulo de galería protegida

### Acceso
- La galería aparece en el menú principal de navegación como un ítem más
- Al pulsar en el menú, se pide el password antes de entrar al módulo
- Password: `bollagas` (compartido entre 6 personas de confianza)
- Usar PageCrypt para cifrar la página de galería con AES en el cliente
- Si el password es correcto: descifra y muestra la galería
- Si es incorrecto: redirige silenciosamente a la home SIN ningún mensaje
  de error ni indicación de que la página requiere autenticación
  (esto requiere customización de PageCrypt, que por defecto muestra un formulario)

### Aviso de seguridad asumido
El sitio es estático puro (GitHub Pages, sin servidor). El token de Dropbox
con permisos de lectura y escritura quedará embebido en el HTML cifrado.
Cualquier persona que conozca el password podrá extraerlo si lo busca.
Esto es aceptable: las 6 personas que tienen el password son de confianza.

### Datos de configuración
- Carpeta Dropbox: `Almacen-archivo/2026-berlin`
- Token de Dropbox: a proporcionar antes de implementar

### Funcionalidad de la galería
- Ver todas las fotos y vídeos de la carpeta Dropbox, organizados por fecha EXIF
- Botón de subida para añadir fotos/vídeos nuevos directamente desde la página
- La galería lee y muestra el contenido via Dropbox API (llamadas desde el cliente)
- Sin límite de tamaño en la subida

### Vídeos
- Reproducción inline dentro de la galería (no link de descarga)
- Se puede usar baja calidad / resolución reducida para que cargue rápido en móvil
- Los temporary links de Dropbox caducan cada 4h: tenerlo en cuenta en el diseño
  (renovar links al abrir la galería, o bajo demanda al reproducir)

### UX — diseñada para móvil principalmente
- Diseño responsive, pensado para usarse desde el móvil durante el viaje
- Galería tipo grid, fotos/vídeos a pantalla completa al tocar
- Subida nativa del móvil (cámara o galería del dispositivo)
- Interfaz simple y rápida, sin florituras

## Contexto técnico
- Eleventy 3.1.2
- Desplegado en GitHub Pages
- Estático puro, sin servidor — toda la lógica en el cliente
- Node.js disponible en el build
- Proporcionar el token de Dropbox antes de empezar la implementación
