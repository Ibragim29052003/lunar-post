import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { port: { type: 'string', default: '8080' } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Порт должен быть числом от 1 до 65535.');
const directory = await realpath(fileURLToPath(new URL('../dist/', import.meta.url))).catch(() => {
  throw new Error('Не найдена папка dist. Сначала выполните npm ci и npm run build.');
});
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.map', 'application/json'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  try {
    const target = await realpath(resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`));
    if (!target.startsWith(`${directory}${sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const metadata = await stat(target);
    if (!metadata.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mime.get(extname(target)) ?? 'application/octet-stream',
      'Content-Length': metadata.size,
      'Cache-Control': 'no-cache',
    });
    if (request.method === 'HEAD') response.end();
    else
      createReadStream(target)
        .on('error', () => response.destroy())
        .pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.on('error', (error) => {
  const hint = error.code === 'EADDRINUSE' ? ' Выберите другой порт через --port.' : '';
  console.error(`Не удалось открыть порт ${port}: ${error.message}.${hint}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Лунная почта: http://127.0.0.1:${port}/`));
const stop = () => server.close();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
