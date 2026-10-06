import { LogLevel } from '@vendure/core';
import { describe, expect, it } from 'vitest';
import { JsonLogger } from './json-logger.js';

function capture(level: LogLevel) {
  const lines: { entry: Record<string, unknown>; level: LogLevel }[] = [];
  const logger = new JsonLogger({ level, process: 'worker' }, (line, lineLevel) => {
    lines.push({ entry: JSON.parse(line) as Record<string, unknown>, level: lineLevel });
  });
  return { logger, lines };
}

describe('JsonLogger', () => {
  it('writes one JSON object per line, with the service and process named', () => {
    const { logger, lines } = capture(LogLevel.Info);
    logger.info('Seeded 5 works', 'Seed');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.entry).toEqual({
      time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      level: 'info',
      service: 'commerce',
      process: 'worker',
      context: 'Seed',
      message: 'Seeded 5 works',
    });
  });

  it('keeps the stack trace of an error, and only of an error', () => {
    const { logger, lines } = capture(LogLevel.Info);
    logger.error('Delivery failed', 'CatalogueHooks', 'Error: boom\n    at deliver');
    logger.warn('Slow delivery', 'CatalogueHooks');
    expect(lines.map(({ entry }) => entry['trace'])).toEqual([
      'Error: boom\n    at deliver',
      undefined,
    ]);
    expect(lines.map(({ level }) => level)).toEqual([LogLevel.Error, LogLevel.Warn]);
  });

  it('drops what is below its level', () => {
    const { logger, lines } = capture(LogLevel.Warn);
    logger.info('hidden');
    logger.verbose('hidden');
    logger.debug('hidden');
    logger.warn('shown');
    expect(lines.map(({ entry }) => entry['message'])).toEqual(['shown']);
  });

  it('falls back to the default context Vendure sets, then to null', () => {
    const { logger, lines } = capture(LogLevel.Debug);
    logger.debug('no context yet');
    logger.setDefaultContext('Vendure');
    logger.verbose('with the default');
    expect(lines.map(({ entry }) => entry['context'])).toEqual([null, 'Vendure']);
  });
});
