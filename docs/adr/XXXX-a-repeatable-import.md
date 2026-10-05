# XXXX. An import that changes nothing when nothing changed

- Status: accepted
- Date: 2026-10-05

## Context

`data/met` is committed and every service seeds from it, so the importer's output is reviewed as a diff. A re-run that rewrote every file, or moved a timestamp, would make a refresh of the data impossible to tell from noise. The importer also downloads 153 MB of originals and needs sharp, which no service needs at runtime.

## Decision

- **Originals are downloaded once**, into `data/met/.cache/originals/<objectId>-<file name>`, through a `.part` file renamed only when the byte count matches `Content-Length`. A file under its final name is always whole, and a new photograph of a work lands under a new name instead of being mistaken for the old one.
- **The original's size is read from its own header** (`image/jpeg-header.ts`), the same reader that probes a remote image with Range requests, so the catalog's `originalWidth` and `originalHeight` are what a print is sized from. The importer checks that the decoded master has the same orientation.
- **`generatedAt` changes only when the works do.** The importer compares the works it built with those already in `catalog.json`, and keeps the old timestamp when they are equal. A file is written only when its bytes differ. A second run with a warm cache rewrote nothing (checked byte for byte on 5 October).
- **The flag is the authority, and the attribution must be firm.** A curated work is refused if The Met does not flag it public domain, has no open-access image, or names its artist with a qualifier (`After`, `Attributed to`, `Workshop of`, `Issued by`, `(?)`) or names only a publisher. The catalog has no field to carry that doubt, so such a work would read as more certain than The Met says it is.
- **The importer and the candidates script run from source with tsx** (`pnpm --filter @deckle/met run import`; `run` is needed because `pnpm import` is a pnpm command). They are left out of the build, and sharp and tsx are dev dependencies: a service that reads the data set with `@deckle/met` gets the schema and `readCatalog`, not an image library.

## Consequences

- A diff of `catalog.json` shows exactly what changed upstream, and `generatedAt` dates the last real change.
- The Met updates records daily (66 on 5 October alone), so a re-run some weeks later will usually show a small diff of credit lines and tags. That is a refresh, reviewed like any other change.
- The cache must be kept to stay cheap; deleting it costs one 153 MB download, never a different result.
- Masters depend on the sharp and libvips versions (see the masters record); an upgrade is followed by a re-run and a review.
- Works such as Winslow Homer's wood engravings for _Harper's Weekly_ and Audubon's _Birds of America_ plates are left out, since The Met lists them "After" their designer.

## Alternatives considered

- **Stamping `generatedAt` on every run**: honest about the run, useless for review, and every re-run a commit.
- **Dropping `generatedAt`**: the schema requires it, and a date for the data is worth having.
- **Hashing the originals instead of comparing the works**: it would not notice a change in The Met's record, which is most of what changes.
- **Building the importer into `dist` with sharp as a dependency**: every service image would carry libvips for nothing.
- **Recording the attribution's qualifier in the catalog**: a new required field breaks every reader of the current schema; an optional one is a half-measure. Leaving those works out costs little in a curated list of 48.
