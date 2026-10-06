# 25. CMS: a small rich-text contract, and a read-only gateway

- Status: accepted
- Date: 2026-10-05
- Versions: Payload 3.90.2, `@payloadcms/richtext-lexical` 3.90.2

## Context

The gateway reads the CMS over REST and turns each story's rich text into typed blocks for the store. Every node type the editor can produce is a node type the gateway must map, and Payload's REST API stores whatever Lexical JSON it is sent: its own validation runs per node type and ignores types it does not know. The gateway signs in as a user of its own, and must only read, drafts included, so the store can preview.

## Decision

**Rich text.** One editor for story and drop-page bodies, with paragraphs, h2 and h3, quotes, bold, italic and links, plus the two toolbars (which add no nodes). Links point outside only (`enabledCollections: []`), are absolute http(s) URLs (a `javascript:` link would otherwise pass), and never appear as `autolink` nodes (`disableAutoLinks`). The editor already strips disabled formats and turns pasted h1 or h4 into h3; the server then checks every body against a Zod schema of exactly these nodes before Lexical's own validation, so the API cannot store what the editor could not make. Alignment, indentation and inline styles can arrive with pasted text; they pass, and the gateway ignores them.

The nodes the gateway maps: `root`, `paragraph`, `heading` (`tag` `h2` or `h3`), `quote`, `text` (`format` bits: 1 bold, 2 italic), `linebreak`, `tab`, and `link` (`fields.linkType` `custom`, `fields.url`, `fields.newTab`).

**Roles.** `users` carry a role: `admin` (everything, including users, API keys and the jobs queue), `editor` (content, their own account, the admin panel) and `gateway` (reads content, drafts and versions included; nothing else, not even the admin panel). Each access function is a small reading of one policy table, unit-tested. Content is invisible to anyone signed out: the store sees it only through the gateway. Editorial images (`media`) are the exception and public, since files have no drafts.

**The gateway's API key.** Payload's API keys can be set to a known value: the seed writes `GATEWAY_API_KEY` to the gateway user's `apiKey` field, Payload stores it encrypted with the secret and looks it up by an HMAC-SHA256 index, and the gateway sends `Authorization: users API-Key <key>`. The seed sets the key on every run, so a changed key or `PAYLOAD_SECRET` is picked up by seeding again. Only admins may set API keys (Payload's default allows anyone with admin-panel access). Because Payload's own collections (document locks, preferences) let any signed-in user write, a Next.js proxy on `/api` refuses any request that signs in with an API key and is not a read (POST with Payload's `X-Payload-HTTP-Method-Override: GET` counts as a read).

**Preview.** `GET <STORE_PREVIEW_URL>?secret=<PREVIEW_SECRET>&type=<story|curation|drop-page>&slug=<slug>`, where a story's slug is its artwork's. The store checks the secret in constant time, turns on draft mode and redirects to the page, which reads drafts through the gateway (`draft=true`). Stories also have live preview: autosave is on, and the store's page re-renders on each save with Payload's `RefreshRouteOnSave`, so the gateway's typed blocks stay the only rendering path.

**Smaller choices.** GraphQL is off (the gateway reads REST). A story has no slug of its own: `subject.slug` repeats `artworkSlug`. Slugs are checked for format, not existence, since the catalogue lives in commerce. The starter curation has no introduction, so its optional `intro` is `null`, and an editor's empty optional text is stored as `null`, never `""`.

## Consequences

- A new rich-text feature is a change to three places: the editor's feature list, the prose schema, and the gateway's mapping.
- The gateway must ask for published content explicitly (`where[_status][equals]=published`) outside preview, since its role can read drafts.
- API keys cannot be used to write, whoever owns them.

## Alternatives rejected

- **Lexical's default feature set.** Lists, uploads, relationships, code, tables and more, each one more node for the gateway.
- **A separate API-key collection for machines.** The brief asks for a `gateway` role in `users`, and access control stays in one place.
- **Public read of published content.** Would make the CMS a second public API beside the gateway.
