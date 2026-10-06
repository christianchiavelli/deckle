import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { en } from '@payloadcms/translations/languages/en';
import { pt } from '@payloadcms/translations/languages/pt';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { administer, administerJobs } from './access/rules';
import type { PreviewLink } from './collections/content';
import { curations } from './collections/curations';
import { dropPages } from './collections/drop-pages';
import { media } from './collections/media';
import { stories } from './collections/stories';
import { users } from './collections/users';
import { healthEndpoint } from './endpoints/health';
import { configEnv } from './env';
import { onPayloadInit } from './lifecycle';
import { migrations } from './migrations';
import { previewUrlFor } from './preview/preview-url';
import { proseEditor } from './rich-text/editor';
import { cmsEventsQueue, deliverCmsEventTask } from './webhooks/task';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const env = configEnv();

const previewLink: PreviewLink = (type, slug) =>
  previewUrlFor(env.STORE_PREVIEW_URL, env.PREVIEW_SECRET, type, slug);

export default buildConfig({
  secret: env.PAYLOAD_SECRET,
  admin: {
    user: users.slug,
    importMap: { baseDir: dirname },
    meta: { titleSuffix: ' · Deckle CMS' },
  },
  // The admin follows the browser's language, and each editor can change it in their account.
  i18n: { supportedLanguages: { en, pt }, fallbackLanguage: 'en' },
  collections: [
    users,
    stories({ previewLink }),
    curations({ previewLink }),
    dropPages({ previewLink }),
    media,
  ],
  editor: proseEditor,
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL },
    migrationDir: path.resolve(dirname, 'migrations'),
    // Development pushes schema changes as the config changes; production
    // applies the committed migrations while Payload starts, before it serves.
    prodMigrations: migrations,
    // The database and its role are provisioned with the stack, never by the app.
    disableCreateDatabase: true,
  }),
  endpoints: [healthEndpoint],
  jobs: {
    tasks: [deliverCmsEventTask({ url: env.GATEWAY_HOOK_URL, secret: env.HOOK_SECRET })],
    access: { queue: administerJobs, run: administerJobs, cancel: administerJobs },
    // The server is long-running, so the queue runs inside it, every five seconds.
    autoRun: [{ queue: cmsEventsQueue, cron: '*/5 * * * * *', limit: 25, disableScheduling: true }],
    // Admins may read the queue in the admin to see a delivery that keeps failing.
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      access: { ...defaultJobsCollection.access, read: administer },
      labels: {
        singular: { en: 'Job', pt: 'Tarefa' },
        plural: { en: 'Jobs', pt: 'Tarefas' },
      },
      admin: {
        ...defaultJobsCollection.admin,
        hidden: false,
        group: { en: 'System', pt: 'Sistema' },
      },
    }),
  },
  // The gateway reads the REST API; nothing uses GraphQL, so it is not served.
  graphQL: { disable: true },
  upload: { limits: { fileSize: 25 * 1024 * 1024 } },
  sharp,
  telemetry: false,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  // Payload pretty-prints by default; production writes one JSON object per line.
  ...(process.env.NODE_ENV === 'production' ? { logger: { options: { level: 'info' } } } : {}),
  onInit: onPayloadInit,
});
