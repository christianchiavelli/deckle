import { describe, expect, it } from 'vitest';
import { TypedDocumentString } from './generated';
import { GatewayError, requestGateway } from './request';

const Document = new TypedDocumentString<{ artwork: { title: string } | null }, { slug: string }>(
  'query Work($slug: String!) { artwork(slug: $slug) { title } }',
);

const URL_ = 'http://gateway:4000/graphql';

/** A fetch that records what it was sent and answers with `body`. */
function answering(body: unknown, status = 200) {
  const sent: { url: string; init: RequestInit | undefined }[] = [];
  const send: typeof fetch = (input, init) => {
    sent.push({ url: input instanceof Request ? input.url : input.toString(), init });
    return Promise.resolve(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
  return { send, sent };
}

describe('requestGateway', () => {
  it('posts the operation and its variables, and returns the data', async () => {
    const { send, sent } = answering({ data: { artwork: { title: 'Melencolia I' } } });
    await expect(
      requestGateway(URL_, Document, { slug: 'melencolia-i' }, { send }),
    ).resolves.toEqual({
      data: { artwork: { title: 'Melencolia I' } },
      complete: true,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe(URL_);
    expect(sent[0]?.init?.method).toBe('POST');
    expect(JSON.parse(sent[0]?.init?.body as string)).toEqual({
      query: 'query Work($slug: String!) { artwork(slug: $slug) { title } }',
      variables: { slug: 'melencolia-i' },
    });
  });

  it('keeps a null the gateway meant: a work it does not have', async () => {
    const { send } = answering({ data: { artwork: null } });
    await expect(requestGateway(URL_, Document, { slug: 'nope' }, { send })).resolves.toEqual({
      data: { artwork: null },
      complete: true,
    });
  });

  it('returns what it can when a field failed, and says the answer is incomplete', async () => {
    const { send } = answering({
      data: { artwork: { title: 'Melencolia I', story: null } },
      errors: [
        { message: 'The cms service could not answer', extensions: { code: 'UPSTREAM_ERROR' } },
      ],
    });
    const answer = await requestGateway(URL_, Document, { slug: 'melencolia-i' }, { send });
    expect(answer.complete).toBe(false);
    expect(answer.data.artwork?.title).toBe('Melencolia I');
  });

  it('throws when there is no data, with the codes the gateway gave', async () => {
    const { send } = answering(
      {
        errors: [
          {
            message: 'Cannot query field "nope"',
            extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
          },
        ],
      },
      400,
    );
    const attempt = requestGateway(URL_, Document, { slug: 'x' }, { send });
    await expect(attempt).rejects.toThrow(
      'The gateway answered 400 with Cannot query field "nope"',
    );
    await expect(attempt).rejects.toMatchObject({ codes: ['GRAPHQL_VALIDATION_FAILED'] });
  });

  it('asks for drafts only when given the preview secret, as draft mode does', async () => {
    const { send, sent } = answering({ data: { artwork: null } });
    await requestGateway(URL_, Document, { slug: 'x' }, { send });
    await requestGateway(URL_, Document, { slug: 'x' }, { send, preview: 'the-preview-secret' });

    const header = (index: number) => new Headers(sent[index]?.init?.headers).get('deckle-preview');
    expect(header(0)).toBeNull();
    expect(header(1)).toBe('the-preview-secret');
  });

  it("names the page's language when it has one, for the CMS's words", async () => {
    const { send, sent } = answering({ data: { artwork: null } });
    await requestGateway(URL_, Document, { slug: 'x' }, { send });
    await requestGateway(URL_, Document, { slug: 'x' }, { send, language: 'pt-BR' });

    const header = (index: number) =>
      new Headers(sent[index]?.init?.headers).get('accept-language');
    expect(header(0)).toBeNull();
    expect(header(1)).toBe('pt-BR');
  });

  it('names an error without a code as unknown, and an empty answer as no data', async () => {
    await expect(
      requestGateway(
        URL_,
        Document,
        { slug: 'x' },
        { send: answering({ data: null, errors: [{ message: 'boom' }] }).send },
      ),
    ).rejects.toMatchObject({ codes: ['UNKNOWN'] });
    await expect(
      requestGateway(URL_, Document, { slug: 'x' }, { send: answering({ data: null }).send }),
    ).rejects.toThrow('The gateway answered 200 with no data');
  });

  it('throws when the answer is not GraphQL, or when nothing answers', async () => {
    await expect(
      requestGateway(
        URL_,
        Document,
        { slug: 'x' },
        { send: answering('<html>Bad gateway</html>', 502).send },
      ),
    ).rejects.toThrow('The gateway answered 502, but not in GraphQL');
    const down: typeof fetch = () => Promise.reject(new TypeError('fetch failed'));
    await expect(requestGateway(URL_, Document, { slug: 'x' }, { send: down })).rejects.toThrow(
      new GatewayError('The gateway did not answer: TypeError: fetch failed'),
    );
  });
});
