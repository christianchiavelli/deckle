import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { redirectRootTo } from './dashboard-root.js';

describe('redirectRootTo', () => {
  it('sends the root to the dashboard and lets every other path through', async () => {
    const redirect = redirectRootTo('/dashboard/');
    const server = createServer((request, response) => {
      redirect(request, response, () => response.writeHead(200).end('next'));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const root = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' });
      expect(root.status).toBe(302);
      expect(root.headers.get('location')).toBe('/dashboard/');

      for (const path of ['/health', '/shop-api', '/dashboard/', '/?page=2']) {
        const other = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual' });
        expect(await other.text(), path).toBe('next');
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
