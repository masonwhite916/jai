import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { stat, existsSync } from 'node:fs';
import { extname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const basePath = process.env.BASE_PATH || '/jai-web';
const port = process.env.PORT || 24752;
const publicDir = resolve(__dirname, 'out');

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const stripBase = (url) => {
  let path = new URL(url, 'http://localhost').pathname;
  if (path.startsWith(basePath)) path = path.slice(basePath.length) || '/';
  return path;
};

const serveFile = async (res, filePath) => {
  const ext = extname(filePath).toLowerCase() || '.html';
  const contentType = mime[ext] || 'application/octet-stream';
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
};

const server = createServer((req, res) => {
  const path = stripBase(req.url || '/');
  let filePath = join(publicDir, path);

  stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return serveFile(res, filePath);
    }
    if (!err && stats.isDirectory()) {
      const index = join(filePath, 'index.html');
      if (existsSync(index)) return serveFile(res, index);
    }
    // Fallback to index.html for SPA routes ( Next.js app routes )
    const index = join(publicDir, 'index.html');
    serveFile(res, index);
  });
});

server.listen(Number(port), '0.0.0.0', () => {
  const displayBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
console.log(`Static dev server listening on http://0.0.0.0:${port}${displayBase}/`);
});
