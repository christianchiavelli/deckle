import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGatewayLogger } from './gateway-logger.js';
import { withRequestId } from './request-context.js';

describe('the gateway logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const linesWritten = () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    return () =>
      write.mock.calls.map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);
  };

  it('writes JSON lines in production, with the id of the request they belong to', () => {
    const lines = linesWritten();
    const logger = createGatewayLogger('production');

    withRequestId('caddy-7f3a9c21', () => {
      logger.log('Handled a delivery', { type: 'price' }, 'HooksService');
    });
    logger.log('Listening', 'Bootstrap');

    expect(lines()).toEqual([
      expect.objectContaining({
        level: 'log',
        message: 'Handled a delivery',
        context: 'HooksService',
        params: { type: 'price' },
        requestId: 'caddy-7f3a9c21',
      }),
      expect.not.objectContaining({ requestId: expect.anything() }),
    ]);
  });

  it('never writes a secret, wherever it sits in what is logged', () => {
    const lines = linesWritten();

    createGatewayLogger('production').warn('Upstream refused', {
      request: { headers: { authorization: 'Bearer s3cr3t' } },
      apiKey: 'k',
    });

    expect(JSON.stringify(lines())).not.toMatch(/s3cr3t|"k"/);
  });

  it('writes readable lines outside production', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    createGatewayLogger('development').log('Listening', 'Bootstrap');

    expect(String(write.mock.calls[0]?.[0])).toContain('Listening');
    expect(() => {
      JSON.parse(String(write.mock.calls[0]?.[0]));
    }).toThrow();
  });
});
