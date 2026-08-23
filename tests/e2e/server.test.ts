import { afterEach, describe, expect, test } from 'vitest';
import { startFixtureServer, type FixtureServer } from './server';

const servers: FixtureServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function fixtureServer(): Promise<FixtureServer> {
  const server = await startFixtureServer();
  servers.push(server);
  return server;
}

describe('deterministic fixture server', () => {
  test('binds only to IPv4 loopback and serves fixtures without caching', async () => {
    const server = await fixtureServer();
    const origin = new URL(server.origin);

    expect(origin.hostname).toBe('127.0.0.1');
    const response = await fetch(server.urlFor('article.html'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    await expect(response.text()).resolves.toContain('Retrieval systems');
  });

  test.each(['/missing.html', '/../package.json', '/%2e%2e%2fpackage.json'])(
    'rejects not-found or traversal path %s with a non-cacheable response',
    async (path) => {
      const server = await fixtureServer();

      const response = await fetch(`${server.origin}${path}`);

      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      await expect(response.text()).resolves.toBe('Fixture not found');
    },
  );
});
