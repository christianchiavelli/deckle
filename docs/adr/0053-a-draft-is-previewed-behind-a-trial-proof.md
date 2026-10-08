# 53. A draft is previewed behind a trial proof

- Status: accepted
- Date: 2026-10-08
- Versions: Next.js 16.3.8, Payload 3.90.2, @payloadcms/live-preview-react 3.90.2
- Scope: `apps/store` (the preview routes, draft mode, the trial proof), `services/gateway` (draft reads), `apps/cms` (live preview), `infra/caddy`, `compose.yaml`, `e2e`

## Context

ADR 0025 set the CMS's half of preview: a link that carries a secret, a store that turns on draft mode and reads drafts through the gateway, and live preview for stories. The store had none of it. Three things were left to settle: how a draft read travels from the store to the CMS without a browser being able to ask for one, how a page says it is showing drafts, and how live preview survives the store and the admin sharing a host.

## Decision

- **The store's preview link turns on draft mode.** `GET /api/preview?secret=&type=&slug=` compares the secret in constant time (401 otherwise), maps the type and slug to one of the store's pages (404 otherwise), turns on Next's draft mode and redirects there: a story to its work's page, at `#story`. `GET /api/preview/exit?path=` turns it off and returns to the path, when the path is the store's own.
- **Drafts are asked for with a second secret, which only the store holds.** In draft mode the store's reads send `Deckle-Preview: <GATEWAY_PREVIEW_SECRET>`. The gateway compares it in constant time and, for that request only, reads the CMS with `draft=true` and without the published filter: stories, curations and drop pages. Caddy drops the header from every request from outside, so a browser that names the secret still reads what is published. Subscriptions never read drafts.
- **Draft mode renders each page afresh.** Next saves no `'use cache'` entry made in draft mode, so a draft never reaches a published page's cache, and prerendering reads draft mode as off, so the static shell carries none of the preview. Saving a draft sends no webhook (ADR 0025), so it invalidates nothing.
- **A page in preview wears a trial proof**, the press's name for a print pulled to check the plate before the edition, and the design the owner chose from three in Storybook: a copper rule around the window, as the edge a plate presses into the paper, and a tab on it that reads "Trial proof · Drafts, not yet published · See the published page". The tab is sticky: in view at any scroll, since a story's preview opens halfway down the page, and settled under the footer at the end, so it never hides the last line. It is the page's last element, so the keyboard reaches it last. Its link leaves preview for the page as it stands, query and anchor included.
- **Live preview frames the store.** Caddy sends `Content-Security-Policy: frame-ancestors 'self' http://localhost:8081`; before, anyone could frame the store. Only inside a frame does the page listen for the admin's saves (`RefreshRouteOnSave`, then `router.refresh()`). Curations and drop pages have live preview too: without autosave, they refresh when the editor saves a draft.
- **The CMS leaves the store's draft cookie alone.** Every port of localhost shares one cookie jar, so the store's `__prerender_bypass` reaches the admin, whose Next server took it for a preview of an older build and cleared it: the frame fell back to the published page at the first autosave. The CMS sets `experimental.multiZoneDraftMode`, the switch Next keeps for apps that share a host.

## Consequences

- A page in preview renders in full on every request: slower than the cached store, and only for the editor.
- The live preview's frame shows the trial proof as well. It is honest about what the frame shows, and takes a line of a narrow pane.
- Anyone holding a preview link sees drafts until they leave: the link is the key, as ADR 0025 has it.
- `multiZoneDraftMode` is experimental and has no documentation in Next 16.3.8. An upgrade that drops it shows in the e2e, as a live preview that falls back to the published title. On hosts of their own, as in a deployment, the cookie would not be shared and the switch would change nothing.
- The e2e signs the CMS's editor in once and shares the cookies. Payload 3.90.2 adds a session by rewriting the user's row, so two sign-ins at the same moment can lose one, and the loser is sent back to the sign-in page. An editor signing in on two devices in the same second would meet it; nothing else does.

## Rejected

- **A preview flag in the store's GraphQL requests, with no secret**: any browser could ask for drafts.
- **The store reading the CMS directly in preview**: a second way to render a story, where ADR 0025 keeps the gateway's typed blocks as the only one.
- **A bar at the top of the page**: a story's preview opens at the story, below it, and the bar would never be seen. Also compared, at the bottom: an ink bar with a stamp, loud, but lost in the dark theme; and a pencil note in the margin, quiet enough to pass for the footer.
- **The store and the CMS on hostnames of their own** (`store.localhost`, `cms.localhost`), which would part their cookies: every address, the passkeys' relying party and the docs would change, for what one setting solves.
- **The same preview id for both Next apps** (`__NEXT_PREVIEW_MODE_ID`): an internal variable, and a secret shared between two apps for no other reason.
