import { parseEnv, seedEnvSchema } from '../env';
import { createCmsClient } from './cms-client';
import { curationSeeds, dropPageSeeds, storySeeds } from './content';
import { seed } from './seed';

/**
 * `pnpm --filter @deckle/cms seed` locally, or `node seed.mjs` in the image:
 * seeds the CMS listening on this host's PORT, which must already be up and
 * migrated (in compose, once the cms service reports healthy).
 */
async function main(): Promise<void> {
  const env = parseEnv(seedEnvSchema, process.env);
  const apiUrl = `http://127.0.0.1:${String(env.PORT)}/api`;
  const steps = await seed(createCmsClient(apiUrl), {
    admin: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
    gatewayApiKey: env.GATEWAY_API_KEY,
    curations: curationSeeds,
    stories: storySeeds,
    dropPages: dropPageSeeds,
  });
  for (const { what, outcome } of steps) {
    process.stdout.write(`${outcome.padEnd(7)} ${what}\n`);
  }
}

main().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Seeding the CMS failed: ${reason}\n`);
  process.exitCode = 1;
});
