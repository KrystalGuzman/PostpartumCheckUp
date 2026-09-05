/**
 * Zero-dependency static server for local development.
 * ES modules need a real origin, so opening index.html from the filesystem
 * will not work; run `npm start` instead.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const path = join(root, relative === '/' ? 'index.html' : relative);

  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Postpartum Check-Up running at http://localhost:${port}`);
});
