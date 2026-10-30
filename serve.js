// Servidor estático mínimo (sin dependencias) para previsualizar la web en local.
// Uso: node serve.js  →  http://localhost:4178
// Replica las cabeceras de seguridad de netlify.toml para probar la web igual que en producción.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT ? Number(process.env.PORT) : 4178;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

// Lee las cabeceras de seguridad de netlify.toml (una sola fuente de verdad).
// En local se quita upgrade-insecure-requests porque localhost va por http.
function securityHeaders() {
  const out = {};
  try {
    const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
    const block = toml.split('[[headers]]')[1] || '';
    for (const m of block.matchAll(/^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/gm)) {
      if (m[1] !== 'for') out[m[1]] = m[2];
    }
    if (out['Content-Security-Policy']) {
      out['Content-Security-Policy'] = out['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests/, '');
    }
  } catch (e) { /* sin netlify.toml: sin cabeceras extra */ }
  return out;
}
const BLOCKED = /^\/(_respaldo|\.claude)(\/|$)|^\/(serve\.js|netlify\.toml|LEEME-PUBLICAR\.md|\.htaccess)$/;

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, path.normalize(urlPath));
  const sec = securityHeaders();

  const notFound = () => {
    const p404 = path.join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': TYPES['.html'], ...sec });
    return fs.existsSync(p404) ? fs.createReadStream(p404).pipe(res) : res.end('Not found');
  };
  if (!filePath.startsWith(ROOT) || BLOCKED.test(urlPath)) return notFound();

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return notFound();
    const ext = path.extname(filePath).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    const range = req.headers.range;

    if (range && ext === '.mp4') {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = m ? parseInt(m[1], 10) : 0;
      const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': type,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-cache', ...sec });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}).listen(PORT, () => console.log(`Generación Tech web → http://localhost:${PORT}`));
