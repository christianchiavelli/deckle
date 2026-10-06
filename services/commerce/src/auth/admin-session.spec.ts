import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { withholdSessionTokenHeader } from './admin-session.js';

describe('withholdSessionTokenHeader', () => {
  it('drops the session token header, whatever its case, and keeps every other header', async () => {
    const withhold = withholdSessionTokenHeader('vendure-auth-token');
    const server = createServer((request, response) => {
      withhold(request, response, () => {
        response.setHeader('Vendure-Auth-Token', 'a-session-token');
        response.setHeader('set-cookie', 'deckle-admin-session=abc; HttpOnly');
        response.setHeader('content-type', 'application/json');
        response.end('{}');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/admin-api`);
      expect(response.headers.get('vendure-auth-token')).toBeNull();
      expect(response.headers.get('set-cookie')).toBe('deckle-admin-session=abc; HttpOnly');
      expect(response.headers.get('content-type')).toBe('application/json');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
