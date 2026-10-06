import type { SecurityHeadersOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Env } from '../config/env.js';
import { requestContext, resumeRequestContext } from '../logging/request-context.js';

/** GraphQL documents and webhook bodies are a few kilobytes; nothing legitimate comes close. */
export const JSON_BODY_LIMIT = '100kb';

/**
 * Nest's own security headers (helmet's defaults, CSP included). The only HTML
 * the gateway serves is GraphiQL, outside production, which loads React and its
 * bundle from unpkg and starts from an inline script; its CSP allows exactly that.
 */
export function securityHeaders(production: boolean): SecurityHeadersOptions {
  if (production) return {};
  return {
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        // Local development runs on plain http; upgrading GraphiQL's own requests would break them.
        upgradeInsecureRequests: null,
      },
    },
  };
}

/**
 * The HTTP pipeline, shared by `main.ts` and the tests so they exercise the same
 * one: request ids first, then security headers and CSRF checks (which run
 * before body parsing), then a JSON-only body parser that keeps the raw bytes
 * for webhook signatures, then the request's async context again. CORS stays off: the browser reaches the gateway
 * through Caddy, on the store's own origin.
 */
export function configureHttp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.use(requestContext);
  app.useSecurityHeaders(securityHeaders(config.get('NODE_ENV', { infer: true }) === 'production'));
  app.enableCsrfProtection({ trustedOrigins: [config.get('PUBLIC_ORIGIN', { infer: true })] });
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(resumeRequestContext);
}
