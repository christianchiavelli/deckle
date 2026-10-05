/** The base of every failure the collection client reports. */
export class MetError extends Error {
  override name = 'MetError';
}

/** The Met answered with a status the client does not retry, or ran out of retries on one it does. */
export class MetHttpError extends MetError {
  override name = 'MetHttpError';
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number, detail: string) {
    super(`GET ${url} answered ${status}: ${detail}`);
    this.url = url;
    this.status = status;
  }
}

/**
 * A 404 for an object. The API words two cases differently: an id that never
 * existed is "ObjectID not found", and one the search still lists but whose
 * record was withdrawn is "Not a valid object".
 */
export class MetNotFoundError extends MetHttpError {
  override name = 'MetNotFoundError';
  readonly reason: 'unknown' | 'withdrawn';

  constructor(url: string, reason: 'unknown' | 'withdrawn') {
    super(url, 404, reason === 'withdrawn' ? 'the record was withdrawn' : 'no such object');
    this.reason = reason;
  }
}

/**
 * The CDN in front of The Met refused the request with its own HTML page: it
 * does that for about a minute once an address passes roughly 80 requests a
 * minute, whatever the documented limit says.
 */
export class MetBlockedError extends MetHttpError {
  override name = 'MetBlockedError';

  constructor(url: string) {
    super(url, 403, 'the CDN blocked this address for sending too many requests');
  }
}

/** The response arrived but is not what the API promises: not JSON, not an image, or the wrong shape. */
export class MetResponseError extends MetError {
  override name = 'MetResponseError';
  readonly url: string;

  constructor(url: string, detail: string, options?: ErrorOptions) {
    super(`GET ${url} sent an unexpected response: ${detail}`, options);
    this.url = url;
  }
}

/** The request never got an answer: a network failure or a timeout, on every try. */
export class MetRequestError extends MetError {
  override name = 'MetRequestError';
  readonly url: string;

  constructor(url: string, attempts: number, options?: ErrorOptions) {
    super(`GET ${url} failed after ${attempts} attempts`, options);
    this.url = url;
  }
}
