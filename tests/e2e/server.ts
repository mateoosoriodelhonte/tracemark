import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const fixtureDirectory = resolve('tests/fixtures/site');

export type FixtureServer = {
  origin: string;
  urlFor: (fixtureName: string) => string;
  close: () => Promise<void>;
};

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error === undefined ? resolveClose() : rejectClose(error)));
  });
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const server = createServer(async (request, response) => {
    const requestedPath = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const fixtureName = basename(requestedPath);

    if (!fixtureName.endsWith('.html') || requestedPath !== `/${fixtureName}`) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Fixture not found');
      return;
    }

    try {
      const content = await readFile(resolve(fixtureDirectory, fixtureName));
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type': 'text/html; charset=utf-8',
      });
      response.end(content);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Fixture not found');
    }
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    await closeServer(server);
    throw new Error('Fixture server did not bind to a TCP port.');
  }

  const origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    urlFor: (fixtureName) => `${origin}/${fixtureName}`,
    close: () => closeServer(server),
  };
}
