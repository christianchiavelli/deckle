// Fails when schema.gql breaks clients of the schema in an earlier commit.
// `schema:check` proves the file matches the code; this proves the change is safe.
//
//   pnpm --filter @deckle/gateway schema:diff            against HEAD~1
//   pnpm --filter @deckle/gateway schema:diff origin/main
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] ?? 'HEAD~1';
const packageDir = fileURLToPath(new URL('..', import.meta.url));

function git(...args) {
  return spawnSync('git', args, { cwd: packageDir, encoding: 'utf8' });
}

if (git('rev-parse', '--verify', '--quiet', `${base}^{commit}`).status !== 0) {
  process.stderr.write(
    `schema:diff: ${base} is not in this clone. A CI checkout needs the commit before it (fetch-depth: 2).\n`,
  );
  process.exit(2);
}

// `./` makes the path relative to this package rather than to the repository root.
const previous = git('show', `${base}:./schema.gql`);
if (previous.status !== 0) {
  process.stdout.write(`schema:diff: ${base} has no schema.gql, so there is nothing to break.\n`);
  process.exit(0);
}

const require = createRequire(import.meta.url);
const inspectorManifest = require.resolve('@graphql-inspector/cli/package.json');
const inspectorBin = JSON.parse(readFileSync(inspectorManifest, 'utf8')).bin['graphql-inspector'];

const workDir = mkdtempSync(join(tmpdir(), 'deckle-schema-'));
try {
  const previousFile = join(workDir, 'previous.gql');
  writeFileSync(previousFile, previous.stdout);
  // The CLI's own entry, on this Node: no shell shim, so it runs the same on Windows.
  const diff = spawnSync(
    process.execPath,
    [
      join(dirname(inspectorManifest), inspectorBin),
      'diff',
      previousFile,
      join(packageDir, 'schema.gql'),
    ],
    { stdio: 'inherit' },
  );
  process.exitCode = diff.status ?? 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
