import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { currentRequestId } from './request-context.js';

interface JsonLogOptions {
  context: string;
  logLevel: LogLevel;
  writeStreamType?: 'stdout' | 'stderr';
  errorStack?: unknown;
  params?: Record<string, unknown>;
  error?: Error;
}

/** Values that must never reach a log line, wherever they sit in a logged object. */
const REDACTED_KEYS = ['authorization', 'cookie', 'apiKey', 'secret', 'token', 'password'];

/**
 * Nest's console logger, plus the id of the request a line was written for.
 * JSON lines carry it as `requestId`, so one request can be followed across the log.
 */
export class GatewayLogger extends ConsoleLogger {
  protected override getJsonLogObject(message: unknown, options: JsonLogOptions) {
    const entry = super.getJsonLogObject(message, options);
    const requestId = currentRequestId();
    return requestId === undefined ? entry : { ...entry, requestId };
  }
}

/** JSON lines in production, for the log collector; readable colours everywhere else. */
export function createGatewayLogger(nodeEnv: string | undefined, logLevels?: LogLevel[]) {
  const json = nodeEnv === 'production';
  return new GatewayLogger({
    json,
    colors: !json,
    redact: REDACTED_KEYS,
    ...(logLevels === undefined ? {} : { logLevels }),
  });
}
