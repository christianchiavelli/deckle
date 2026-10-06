import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import type { Env } from '../config/env.js';
import { AdminApiClient, VENDURE_API_KEY_HEADER } from './admin-api.client.js';

describe('AdminApiClient', () => {
  const upstreams = new FakeUpstreams();

  beforeAll(async () => {
    await upstreams.start();
  });

  afterAll(async () => {
    await upstreams.close();
  });

  it("authenticates with the gateway's API key in Vendure's header, never with a session", async () => {
    const config = new ConfigService<Env, true>({
      COMMERCE_ADMIN_API_URL: `${upstreams.commerceUrl}/admin-api`,
      COMMERCE_API_KEY: 'lookupid:secret',
    });
    const admin = new AdminApiClient(config);

    const data = await admin.query({
      operationName: 'Echo',
      document: 'query Echo { echo }',
      data: z.object({ echo: z.boolean() }),
    });

    expect(data).toEqual({ echo: true });
    expect(VENDURE_API_KEY_HEADER).toBe('vendure-api-key');
    const [sent] = upstreams.requests.commerce;
    expect(sent?.path).toBe('/admin-api');
    expect(sent?.headers[VENDURE_API_KEY_HEADER]).toBe('lookupid:secret');
    expect(sent?.headers.authorization).toBeUndefined();
    expect(sent?.headers.cookie).toBeUndefined();
  });
});
