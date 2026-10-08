import { describe, expect, it, vi } from 'vitest';
import { CmsApiError, CmsUnreachableError, createCmsClient, type Session } from './cms-client';

const session: Session = {
  token: 'jwt-token',
  user: { id: 1, email: 'admin@deckle.local', role: 'admin' },
};

/** A fake `fetch` that answers every call with `body`, and records what was asked. */
function answering(body: unknown, status = 200) {
  const send = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json(body, { status, statusText: status === 200 ? 'OK' : 'Nope' })),
  );
  const call = (index = 0) => {
    const [url, init] = send.mock.calls[index]!;
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    return {
      url: new URL(url instanceof Request ? url.url : url),
      method: init?.method,
      headers,
      body,
    };
  };
  return { send, call };
}

describe('the CMS client', () => {
  it('asks whether any user exists', async () => {
    const { send, call } = answering({ initialized: false });
    await expect(createCmsClient('http://cms.test/api/', send).isInitialised()).resolves.toBe(
      false,
    );
    expect(call().url.href).toBe('http://cms.test/api/users/init');
    expect(call().method).toBe('GET');
  });

  it('registers the first user with a role and signs in with a password', async () => {
    const { send, call } = answering(session);
    const cms = createCmsClient('http://cms.test/api', send);
    const credentials = { email: 'admin@deckle.local', password: 'long-enough-password' };

    await expect(cms.registerFirstUser(credentials, 'admin')).resolves.toEqual(session);
    expect(call(0).url.pathname).toBe('/api/users/first-register');
    expect(call(0).body).toEqual({ ...credentials, role: 'admin' });
    expect(call(0).headers.get('content-type')).toBe('application/json');

    await expect(cms.login(credentials)).resolves.toEqual(session);
    expect(call(1).url.pathname).toBe('/api/users/login');
    expect(call(1).method).toBe('POST');
  });

  it('finds a document by a field, drafts included, as the signed-in user', async () => {
    const { send, call } = answering({ docs: [{ id: 12 }] });
    const id = await createCmsClient('http://cms.test/api', send).findIdBy(
      session,
      'stories',
      'artworkSlug',
      'melencolia-i',
    );
    expect(id).toBe(12);
    const { url, headers } = call();
    expect(url.pathname).toBe('/api/stories');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      'where[artworkSlug][equals]': 'melencolia-i',
      limit: '1',
      depth: '0',
      draft: 'true',
    });
    expect(headers.get('authorization')).toBe('JWT jwt-token');
  });

  it('answers null when nothing matches', async () => {
    const { send } = answering({ docs: [] });
    await expect(
      createCmsClient('http://cms.test/api', send).findIdBy(session, 'curations', 'slug', 'x'),
    ).resolves.toBeNull();
  });

  it('creates and updates documents', async () => {
    const { send, call } = answering({ doc: { id: 3 } });
    const cms = createCmsClient('http://cms.test/api', send);

    await expect(cms.create(session, 'curations', { slug: 'first-impressions' })).resolves.toBe(3);
    expect(call(0).method).toBe('POST');
    expect(call(0).url.pathname).toBe('/api/curations');
    expect(call(0).body).toEqual({ slug: 'first-impressions' });

    await cms.update(session, 'users', 3, { apiKey: 'key' });
    expect(call(1).method).toBe('PATCH');
    expect(call(1).url.pathname).toBe('/api/users/3');
    expect(call(1).headers.get('authorization')).toBe('JWT jwt-token');
  });

  it('changes and reads a document in a locale, its newest version and no fallback', async () => {
    const { send, call } = answering({ doc: { id: 3 }, id: 3, _status: 'draft', title: null });
    const cms = createCmsClient('http://cms.test/api', send);

    await cms.update(session, 'stories', 3, { title: 'Sobre a gravura' }, 'pt');
    expect(call(0).url.searchParams.get('locale')).toBe('pt');

    await expect(cms.readInLocale(session, 'stories', 3, 'pt')).resolves.toMatchObject({
      _status: 'draft',
      title: null,
    });
    expect(call(1).method).toBe('GET');
    expect(call(1).url.pathname).toBe('/api/stories/3');
    expect(Object.fromEntries(call(1).url.searchParams)).toEqual({
      locale: 'pt',
      'fallback-locale': 'none',
      draft: 'true',
      depth: '0',
    });
  });

  it('asks who an API key signs in as, the way the gateway sends it', async () => {
    const { send, call } = answering({ user: { id: 2, email: 'gw@x.test', role: 'gateway' } });
    const cms = createCmsClient('http://cms.test/api', send);
    await expect(cms.whoHasApiKey('the-key')).resolves.toMatchObject({ role: 'gateway' });
    expect(call().url.pathname).toBe('/api/users/me');
    expect(call().headers.get('authorization')).toBe('users API-Key the-key');
  });

  it('answers null for an API key that signs in as nobody', async () => {
    const { send } = answering({ user: null });
    await expect(
      createCmsClient('http://cms.test/api', send).whoHasApiKey('k'),
    ).resolves.toBeNull();
  });

  it('signs out', async () => {
    const { send, call } = answering({ message: 'Logged out' });
    await createCmsClient('http://cms.test/api', send).logout(session);
    expect(call().url.pathname).toBe('/api/users/logout');
    expect(call().headers.get('authorization')).toBe('JWT jwt-token');
  });

  it("reports Payload's own error messages", async () => {
    const { send } = answering(
      { errors: [{ message: 'The email or password is incorrect.' }] },
      401,
    );
    const failure = createCmsClient('http://cms.test/api', send).login({
      email: 'admin@deckle.local',
      password: 'wrong-password',
    });
    await expect(failure).rejects.toBeInstanceOf(CmsApiError);
    await expect(failure).rejects.toThrow(
      'POST /users/login answered 401: The email or password is incorrect.',
    );
  });

  it('falls back to the status text for an error it cannot read', async () => {
    const { send } = answering('<html>', 502);
    await expect(createCmsClient('http://cms.test/api', send).isInitialised()).rejects.toThrow(
      'GET /users/init answered 502: Nope',
    );
    const page = new Response('<html>Bad gateway</html>', {
      status: 502,
      statusText: 'Bad Gateway',
    });
    const html = vi.fn<typeof fetch>().mockResolvedValue(page);
    await expect(createCmsClient('http://cms.test/api', html).isInitialised()).rejects.toThrow(
      'GET /users/init answered 502: Bad Gateway',
    );
  });

  it('refuses an answer of the wrong shape', async () => {
    const { send } = answering({ initialized: 'yes' });
    await expect(createCmsClient('http://cms.test/api', send).isInitialised()).rejects.toThrow();
  });

  it('says plainly when nothing is listening', async () => {
    const send = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    const failure = createCmsClient('http://127.0.0.1:3000/api', send).isInitialised();
    await expect(failure).rejects.toBeInstanceOf(CmsUnreachableError);
    await expect(failure).rejects.toThrow(
      'Nothing answered at http://127.0.0.1:3000: is the CMS running and healthy?',
    );
  });
});
