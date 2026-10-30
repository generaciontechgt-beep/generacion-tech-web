# Generación Tech: cómo publicar la web

## 1. Qué se publica

Subí **todo el contenido de esta carpeta excepto**:

| No subir | Por qué |
|---|---|
| `_respaldo/` | Versiones anteriores y los videos viejos (≈ 88 MB). Igual quedan bloqueados por `netlify.toml` / `.htaccess`, pero no hace falta subirlos. Cuando estés conforme con la web nueva, podés borrar esta carpeta. |
| `.claude/` | Configuración del entorno de desarrollo. |
| `serve.js` | Servidor local para previsualizar (`node serve.js` → http://localhost:4178). |
| `LEEME-PUBLICAR.md` | Este archivo. |

Estructura que queda online:

```
index.html · 404.html · robots.txt · sitemap.xml · site.webmanifest
netlify.toml (Netlify) · .htaccess (hostings Apache: Hostinger, DonWeb, cPanel)
css/styles.css
js/main.js · js/aurora.js
assets/ (fuentes Montserrat + img/: logo SVG, favicons, íconos y portada para redes)
```

### Netlify conectado a GitHub (recomendado)
El código está en https://github.com/ivanjpbernal-lang/generaciontech (rama `main`). `_respaldo/` y `.claude/` no se suben porque están en `.gitignore`.

1. Entrá a https://app.netlify.com → **Add new site → Import an existing project → GitHub**.
2. Autorizá a Netlify y elegí el repo `generaciontech`.
3. Configuración: **Branch** `main`, **Build command** vacío, **Publish directory** `.` (ya lo define `netlify.toml`). Tocá **Deploy**.
4. En **Domain management**, conectá tu dominio.

Desde ahí, cada cambio que se suba a `main` se publica solo en 1–2 minutos.

### Netlify sin GitHub (alternativa)
**Add new site → Deploy manually** y arrastrá la carpeta (sin `_respaldo/`). `netlify.toml` ya configura las cabeceras de seguridad, la caché y la página 404.

### Hosting tradicional (Hostinger, DonWeb, etc.)
Subí los archivos a `public_html/` por el administrador de archivos o FTP. El `.htaccess` aplica las mismas cabeceras y la página 404.

## 2. Activá el formulario (una sola vez, obligatorio)

El formulario envía las consultas a **generaciontech.gt@gmail.com** mediante [FormSubmit](https://formsubmit.co) (gratis y sin backend).

1. Con la web ya publicada, completá y enviá el formulario una vez vos mismo.
2. Vas a recibir un mail de FormSubmit en generaciontech.gt@gmail.com: hacé clic en **Activate Form**. Revisá también Spam/Promociones.
3. Listo: desde ese momento cada consulta te llega por mail, con el email del cliente como "Responder a".

> Hasta que no lo actives, las consultas no llegan. En ese caso la web le muestra al visitante botones para enviar lo mismo por WhatsApp o por email, así que no se pierde el contacto.

**Opcional (privacidad):** después de activar, FormSubmit te manda un alias aleatorio (por ejemplo `https://formsubmit.co/ajax/abc123...`). Si lo usás en lugar del email en `index.html` (atributos `action` y `data-endpoint` del `<form id="contactForm">`), tu dirección deja de verse en el código.

**Alternativa con Formspree:** creá un formulario en https://formspree.io y reemplazá `action` y `data-endpoint` por `https://formspree.io/f/TU_ID`. La CSP ya permite ese dominio.

## 3. Revisá antes de publicar

- **Dominio:** la web asume `https://generaciontech.com.ar/`. Si tu dominio es otro, reemplazalo en `index.html` (canonical, Open Graph, Twitter y datos estructurados), `sitemap.xml` y `robots.txt`.
- **Redes sociales:** en el footer de `index.html` hay un bloque comentado para Instagram y LinkedIn. Descomentalo y completá tus URLs.
- **Testimonios y métricas:** confirmá que los testimonios (Martín Rodríguez, Laura Giménez, Carlos Vega) y los números (+50 socios, 98 %, −60 %) son reales. Si son de ejemplo, reemplazalos o quitalos antes de publicar. Publicar reseñas inventadas puede traer problemas con la Ley de Defensa del Consumidor.
- **Política de privacidad (recomendado):** el formulario recoge nombre, email y teléfono. La Ley 25.326 de Protección de Datos Personales sugiere informar para qué se usan. Hoy hay una nota breve debajo del botón; podés sumar una página de privacidad.

## 4. Después de publicar

- Compartí el link en WhatsApp para verificar la vista previa (usa `assets/img/og-cover.jpg`).
- Probá el link de WhatsApp desde el celular.
- Cargá el sitio en Google Search Console y enviá `sitemap.xml`.
