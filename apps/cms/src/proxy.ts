import { type NextRequest, NextResponse } from 'next/server';
import { isApiKeyWrite } from './access/api-key-guard';

/** Every request that signs in with an API key may only read. */
export function proxy(request: NextRequest): NextResponse {
  if (isApiKeyWrite(request.method, request.headers)) {
    return NextResponse.json({ errors: [{ message: 'API keys may only read' }] }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
