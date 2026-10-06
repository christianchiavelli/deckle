import { defineConfig } from 'drizzle-kit';

// Each feature declares its own tables next to its code; a later feature (passkeys,
// sessions, drops) adds a `*.table.ts` and `pnpm db:generate` writes the next migration.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/*.table.ts',
  out: './drizzle',
});
