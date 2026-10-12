import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const options = { host: '127.0.0.1', port: 4173, base: '/' };

for (let i = 0; i < args.length; i += 1) {
  const flag = args[i];
  if (!['--host', '--port', '--base'].includes(flag) || !args[i + 1]) {
    console.error('Usage: node server.mjs [--host 127.0.0.1] [--port 4173] [--base /AtlasReid-PWA/]');
    process.exit(1);
  }
  options[flag.slice(2)] = args[++i];
}

options.port = Number(options.port);
if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
  console.error('Port must be an integer between 1 and 65535.');
  process.exit(1);
}
if (!/^\/[A-Za-z0-9_/-]*$/.test(options.base) || options.base.includes('//') || options.base.includes('..')) {
  console.error('Base must be an absolute URL path, such as /AtlasReid-PWA/.');
  process.exit(1);
}
if (!options.base.endsWith('/')) options.base += '/';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

const isContained = (target) => {
  const child = relative(root, target);
  return !isAbsolute(child) && child !== '..' && !child.startsWith(`..${sep}`);
};

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  const reply = (status, message) => {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(request.method === 'HEAD' ? undefined : `${message}\n`);
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    reply(405, 'Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    reply(400, 'Invalid URL');
    return;
  }

  const bareBase = options.base.slice(0, -1);
  if (bareBase && pathname === bareBase) {
    response.writeHead(302, { Location: options.base });
    response.end();
    return;
  }
  if (!pathname.startsWith(options.base)) {
    reply(404, 'Not found');
    return;
  }

  const localPath = pathname.slice(options.base.length);
  if (localPath.includes('\0') || localPath.split(/[\\/]/).some((part) => part.startsWith('.'))) {
    reply(403, 'Forbidden');
    return;
  }

  let target = resolve(root, localPath || 'index.html');
  if (!isContained(target)) {
    reply(403, 'Forbidden');
    return;
  }

  try {
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    target = await realpath(target);
    if (!isContained(target)) {
      reply(403, 'Forbidden');
      return;
    }
    const details = await stat(target);
    if (!details.isFile()) {
      reply(404, 'Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': details.size
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    const stream = createReadStream(target);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch (error) {
    reply(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500,
      ['ENOENT', 'ENOTDIR'].includes(error.code) ? 'Not found' : 'Unable to read file');
  }
});

server.on('error', (error) => {
  console.error(`Cannot start preview: ${error.message}`);
  process.exitCode = 1;
});

server.listen(options.port, options.host, () => {
  const displayHost = options.host.includes(':') ? `[${options.host}]` : options.host;
  console.log(`AtlasReid PWA tech demo\nLocal: http://${displayHost}:${options.port}${options.base}\nPress Ctrl+C to stop.`);
});
