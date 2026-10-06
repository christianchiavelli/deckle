import { randomBytes } from 'node:crypto';
import { proseFromParagraphs } from '../rich-text/prose';
import type { CmsClient, Credentials, Session } from './cms-client';
import type { CurationSeed, DropPageSeed, StorySeed } from './content';

/** The user the gateway reads as. Its password is random and thrown away: it signs in by API key. */
export const gatewayUserEmail = 'gateway@deckle.internal';

export interface SeedInput {
  readonly admin: Credentials;
  readonly gatewayApiKey: string;
  readonly curations: readonly CurationSeed[];
  readonly stories: readonly StorySeed[];
  readonly dropPages: readonly DropPageSeed[];
}

export type SeedOutcome = 'created' | 'updated' | 'kept';

export interface SeedStep {
  readonly what: string;
  readonly outcome: SeedOutcome;
}

export class SeedError extends Error {
  override readonly name = 'SeedError';
}

/**
 * Brings a CMS to the state a fresh stack needs, as many times as it is run:
 * the admin exists, the gateway's user reads with `gatewayApiKey`, and the
 * starter curations, stories and drop pages exist. Content an editor has
 * since changed is kept as it is; only the API key is set every time, so the
 * CMS always matches the key the gateway was given.
 */
export async function seed(cms: CmsClient, input: SeedInput): Promise<SeedStep[]> {
  const steps: SeedStep[] = [];
  const { session, outcome } = await signInAsAdmin(cms, input.admin);
  steps.push({ what: `admin ${input.admin.email}`, outcome });

  try {
    steps.push(await ensureGatewayUser(cms, session, input.gatewayApiKey));
    for (const curation of input.curations) {
      steps.push(await ensureCuration(cms, session, curation));
    }
    for (const story of input.stories) {
      steps.push(await ensureStory(cms, session, story));
    }
    for (const page of input.dropPages) {
      steps.push(await ensureDropPage(cms, session, page));
    }
  } finally {
    await cms.logout(session);
  }
  return steps;
}

async function signInAsAdmin(
  cms: CmsClient,
  admin: Credentials,
): Promise<{ session: Session; outcome: SeedOutcome }> {
  const created = !(await cms.isInitialised());
  const session = created ? await cms.registerFirstUser(admin, 'admin') : await cms.login(admin);
  if (session.user.role !== 'admin') {
    throw new SeedError(`${admin.email} signs in as ${session.user.role}, not as an admin`);
  }
  return { session, outcome: created ? 'created' : 'kept' };
}

async function ensureGatewayUser(
  cms: CmsClient,
  session: Session,
  apiKey: string,
): Promise<SeedStep> {
  const what = `gateway user ${gatewayUserEmail}`;
  const access = { role: 'gateway', apiKey, enableAPIKey: true };
  const id = await cms.findIdBy(session, 'users', 'email', gatewayUserEmail);
  if (id === null) {
    const password = randomBytes(32).toString('base64url');
    await cms.create(session, 'users', { email: gatewayUserEmail, password, ...access });
  } else {
    await cms.update(session, 'users', id, access);
  }

  // Proves the key works the way the gateway will use it, not just that it was stored.
  const signedIn = await cms.whoHasApiKey(apiKey);
  if (signedIn?.email !== gatewayUserEmail || signedIn.role !== 'gateway') {
    throw new SeedError('The gateway API key does not sign in as the gateway user');
  }
  return { what, outcome: id === null ? 'created' : 'updated' };
}

async function ensureCuration(
  cms: CmsClient,
  session: Session,
  curation: CurationSeed,
): Promise<SeedStep> {
  const what = `curation ${curation.slug}`;
  if ((await cms.findIdBy(session, 'curations', 'slug', curation.slug)) !== null) {
    return { what, outcome: 'kept' };
  }
  await cms.create(session, 'curations', {
    title: curation.title,
    slug: curation.slug,
    intro: curation.intro,
    artworks: curation.artworks,
    _status: 'published',
  });
  return { what, outcome: 'created' };
}

async function ensureStory(cms: CmsClient, session: Session, story: StorySeed): Promise<SeedStep> {
  const what = `story ${story.artworkSlug}`;
  if ((await cms.findIdBy(session, 'stories', 'artworkSlug', story.artworkSlug)) !== null) {
    return { what, outcome: 'kept' };
  }
  await cms.create(session, 'stories', {
    artworkSlug: story.artworkSlug,
    title: story.title,
    lede: story.lede,
    body: proseFromParagraphs(story.paragraphs),
    sources: story.sources,
    _status: 'published',
  });
  return { what, outcome: 'created' };
}

async function ensureDropPage(
  cms: CmsClient,
  session: Session,
  page: DropPageSeed,
): Promise<SeedStep> {
  const what = `drop page ${page.slug}`;
  if ((await cms.findIdBy(session, 'drop-pages', 'slug', page.slug)) !== null) {
    return { what, outcome: 'kept' };
  }
  await cms.create(session, 'drop-pages', {
    slug: page.slug,
    artworkSlug: page.artworkSlug,
    headline: page.headline,
    body: proseFromParagraphs(page.paragraphs),
    _status: 'published',
  });
  return { what, outcome: 'created' };
}
