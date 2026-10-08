import { check, fail, sleep } from 'k6';
import exec from 'k6/execution';
import http, { type CookieJar } from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import type { Options } from 'k6/options';
import { type CreationOptions, makePasskey } from './support/authenticator.ts';

/*
 * A thousand people claim a copy of the open drop in the same second, through
 * every gateway Caddy knows: two, as `pnpm --filter @deckle/load test:load`
 * starts them. Each has made a passkey of its own beforehand, and waits for
 * the same instant. The database must hand out exactly the copies that were
 * open, one each, and turn everyone else away; then each copy is given back,
 * so the drop ends as it began.
 */

const STORE = __ENV['DECKLE_URL'] ?? 'http://localhost:8080';
const GRAPHQL = `${STORE}/graphql`;
/** The origin a passkey is made for, and the one the gateway's CSRF check trusts. */
const ORIGIN = __ENV['DECKLE_ORIGIN'] ?? 'http://localhost:8080';
const DROP = __ENV['DECKLE_DROP'] ?? 'melencolia-i-numbered';
const PEOPLE = Number(__ENV['PEOPLE'] ?? '1000');
/** People who make their passkeys at the same time while the test sets up. */
const SIGN_UPS_AT_ONCE = 50;
/** Time for every person to be ready when setup ends, before the claims go out together. */
const READY_MS = 5_000;
/** How long the copies stay held, so the count can be read, before they go back. */
const HOLD_MS = 10_000;

const holds = new Counter('drop_holds');
const refusals = new Counter('drop_refusals');
/** People not yet ready when the others claimed. */
const late = new Counter('drop_late_claims');
/** How long after the agreed instant each claim left: the burst's spread. */
const lag = new Trend('drop_claim_lag', true);

export const options: Options = {
  setupTimeout: '5m',
  batch: SIGN_UPS_AT_ONCE,
  batchPerHost: SIGN_UPS_AT_ONCE,
  scenarios: {
    people: {
      executor: 'per-vu-iterations',
      vus: PEOPLE,
      iterations: 1,
      maxDuration: '2m',
      exec: 'person',
    },
    tally: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '2m',
      exec: 'tally',
    },
  },
  thresholds: {
    // Every person is answered, and the tally finds the copies where they should be.
    checks: ['rate==1'],
    // Nothing fails as HTTP: a copy refused is an answer, not an error.
    http_req_failed: ['rate==0'],
    // All in the same second.
    drop_late_claims: ['count==0'],
    drop_claim_lag: ['max<1000'],
    // Skipping locked rows answers everyone within a few seconds even on a small
    // machine; claims that queued behind each other's locks would take minutes.
    'http_req_duration{call:claim}': ['p(95)<5000'],
  },
};

interface Answer<T> {
  readonly data?: T | null;
  readonly errors?: readonly {
    readonly message: string;
    readonly extensions?: { readonly code?: string };
  }[];
}

const HEADERS = { 'Content-Type': 'application/json', Origin: ORIGIN };

const body = (query: string, variables: Record<string, unknown> = {}) =>
  JSON.stringify({ query, variables });

const answerOf = <T>(response: { json: () => unknown }) => response.json() as Answer<T>;

/** A request from one person's browser: its session cookie, and nothing else of theirs. */
function graphql<T>(
  call: string,
  session: string | null,
  query: string,
  variables?: Record<string, unknown>,
): Answer<T> {
  return answerOf<T>(
    http.post(GRAPHQL, body(query, variables), {
      headers: HEADERS,
      cookies: session === null ? {} : { deckle_session: { value: session, replace: true } },
      tags: { call },
    }),
  );
}

interface Stock {
  readonly open: number;
  readonly held: number;
  readonly sold: number;
}

interface DropState {
  readonly opensAt: string;
  readonly stock: Stock;
}

function dropState(): DropState | null {
  const answer = graphql<{ drop: DropState | null }>(
    'tally',
    null,
    'query DropState($slug: String!) { drop(slug: $slug) { opensAt stock { open held sold } } }',
    { slug: DROP },
  );
  return answer.data?.drop ?? null;
}

const START = 'mutation { startPasskeyRegistration }';
const FINISH =
  'mutation SignUp($response: String!) { finishPasskeyRegistration(response: $response) { id } }';

/**
 * Makes `count` people at once, each in a browser of its own: the gateway's
 * options, a passkey made in software, the account. Returns their sessions.
 */
async function signUp(count: number): Promise<string[]> {
  const jars: CookieJar[] = Array.from({ length: count }, () => new http.CookieJar());
  const asked = http.batch(
    jars.map((jar) => ({
      method: 'POST',
      url: GRAPHQL,
      body: body(START),
      params: { headers: HEADERS, jar, tags: { call: 'sign-up' } },
    })),
  );
  const passkeys = await Promise.all(
    asked.map((response) => {
      const answer = answerOf<{ startPasskeyRegistration: string }>(response);
      const options = answer.data?.startPasskeyRegistration;
      if (options === undefined) {
        fail(`No passkey options (${String(response.status)}): ${JSON.stringify(answer.errors)}`);
      }
      return makePasskey(JSON.parse(options) as CreationOptions, ORIGIN);
    }),
  );
  const made = http.batch(
    passkeys.map((passkey, index) => ({
      method: 'POST',
      url: GRAPHQL,
      body: body(FINISH, { response: JSON.stringify(passkey) }),
      params: { headers: HEADERS, jar: jars[index], tags: { call: 'sign-up' } },
    })),
  );
  return made.map((response, index) => {
    const answer = answerOf<{ finishPasskeyRegistration: { id: string } }>(response);
    const session = jars[index]?.cookiesForURL(GRAPHQL)['deckle_session']?.[0];
    if (!answer.data || session === undefined) {
      fail(`A passkey was refused (${String(response.status)}): ${JSON.stringify(answer.errors)}`);
    }
    return session;
  });
}

interface Plan {
  /** The instant everyone claims, in milliseconds since the epoch. */
  readonly claimAt: number;
  readonly before: Stock;
  /** How many copies the people should end up holding. */
  readonly expected: number;
  /**
   * Every person's session, in the order the people scenario runs them, as one
   * string of equal widths: each person gets a copy of the plan, and a thousand
   * copies of a thousand strings kept the collector busy enough to spread the
   * burst by a quarter of a second.
   */
  readonly sessions: string;
  readonly width: number;
}

export async function setup(): Promise<Plan> {
  const state = dropState();
  if (state === null) {
    fail(`There is no drop called ${DROP}`);
  }
  if (Date.parse(state.opensAt) > Date.now()) {
    fail(`${DROP} opens at ${state.opensAt}; the test needs it open`);
  }
  if (state.stock.open === 0) {
    fail(`${DROP} has no copy open to claim`);
  }
  const sessions: string[] = [];
  while (sessions.length < PEOPLE) {
    sessions.push(...(await signUp(Math.min(SIGN_UPS_AT_ONCE, PEOPLE - sessions.length))));
  }
  // The gateway's session is 32 random bytes in base64url, so each is as wide as the next.
  const width = sessions[0]?.length ?? 0;
  if (sessions.some((session) => session.length !== width)) {
    fail('The sessions are not all as wide; the plan cannot pack them');
  }
  return {
    claimAt: Date.now() + READY_MS,
    before: state.stock,
    expected: Math.min(PEOPLE, state.stock.open),
    sessions: sessions.join(''),
    width,
  };
}

const sleepUntil = (instant: number) => {
  sleep(Math.max(0, instant - Date.now()) / 1000);
};

/** One person: a claim at the agreed instant, then the copy, if any, given back. */
export function person(plan: Plan): void {
  const start = exec.scenario.iterationInTest * plan.width;
  const session = plan.sessions.slice(start, start + plan.width);
  if (session === '') {
    fail(`No one to claim as person ${String(exec.scenario.iterationInTest)}`);
  }
  if (Date.now() > plan.claimAt) {
    late.add(1);
  }
  sleepUntil(plan.claimAt);
  lag.add(Date.now() - plan.claimAt);
  const claimed = graphql<{ claimCopy: { number: number } }>(
    'claim',
    session,
    'mutation Claim($drop: String!) { claimCopy(drop: $drop) { number } }',
    { drop: DROP },
  );
  const copy = claimed.data?.claimCopy ?? null;
  const refusal = claimed.errors?.[0]?.extensions?.code;
  check(claimed, {
    'a claim is answered with a copy, or with none left': () =>
      copy !== null || refusal === 'NO_COPY_OPEN',
  });
  if (copy === null) {
    refusals.add(1);
    return;
  }
  holds.add(1);

  sleepUntil(plan.claimAt + HOLD_MS);
  const released = graphql<{ releaseCopy: boolean }>(
    'release',
    session,
    'mutation Release($drop: String!) { releaseCopy(drop: $drop) }',
    { drop: DROP },
  );
  check(released, { 'a copy is given back': (answer) => answer.data?.releaseCopy === true });
}

/** Reads the copies once everyone has claimed, and again once they are given back. */
export function tally(plan: Plan): void {
  const { before, expected } = plan;

  sleepUntil(plan.claimAt + HOLD_MS / 2);
  check(dropState()?.stock, {
    'the open copies are held, each by one person, and no more': (stock) =>
      stock?.open === before.open - expected &&
      stock.held === before.held + expected &&
      stock.sold === before.sold,
  });

  sleepUntil(plan.claimAt + HOLD_MS + 5_000);
  check(dropState()?.stock, {
    'the drop ends as it began': (stock) =>
      stock?.open === before.open && stock.held === before.held && stock.sold === before.sold,
  });
}
