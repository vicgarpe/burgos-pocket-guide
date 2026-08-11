# OCR + Traducción con Claude API — Estado y decisiones

## Idea
Añadir un recurso en la sección "recursos" del site que permita:
- Pulsar un botón "Traducir"
- Abrir la cámara o selector de archivo de imagen
- Enviar la imagen a la API de Claude para OCR + traducción al castellano
- Mostrar el resultado en pantalla

No va en la galería (que es visor visual de fotos/vídeos). Va como recurso independiente, útil en viaje para traducir carteles, menús, documentos, etc.

## Decisiones tomadas

### API key y seguridad
- La API key de Anthropic NO puede ir en el JS del cliente (GitHub Pages es público)
- Solución: función serverless como proxy (recibe la imagen del cliente, llama a Claude, devuelve el texto)
- Proteger la página del recurso con el mismo mecanismo que la galería (AES-256-GCM + contraseña)
- Si hay abuso se para el servicio

### Claude Pro vs API
- Claude Pro (claude.ai) NO incluye acceso a la API
- Necesita cuenta separada en console.anthropic.com con créditos de pago
- Coste mínimo para uso personal: pocos céntimos por imagen con claude-haiku-4-5

### Modelo recomendado
- `claude-haiku-4-5` — suficiente para OCR + traducción, el más barato

## Problema de arquitectura — pendiente de decidir

GitHub Pages es 100% estático, no puede ejecutar funciones serverless. Opciones:

### Opción A: Migrar a Netlify (recomendada)
- Añadir carpeta `netlify/functions/ocr.js` en el repo actual
- Netlify despliega el site estático + la function automáticamente
- Gratis hasta 125k invocaciones/mes
- Cambio mínimo en el workflow actual
- La API key va como variable de entorno en Netlify (igual que los secrets de GitHub Actions)

### Opción B: Mantener GH Pages + function en repo/servicio aparte
- Site sigue en GitHub Pages
- Function serverless en Vercel (repo separado) o similar
- Más piezas móviles, más mantenimiento

## Pendiente de decidir
- ¿Migrar a Netlify o mantener GH Pages con servicio aparte?
- Una vez decidido, implementar la function y la página de recurso
