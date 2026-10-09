# 56. The story shows its detail

- Status: accepted
- Date: 2026-10-09
- Versions: Payload 3.90.2 (`@payloadcms/db-postgres` 3.90.2), Next.js 16.3.8, NestJS 12.1.2
- Scope: `apps/cms` (the story's detail, a migration, the seed), `services/gateway` (`StoryDetail`), `apps/store` (the work's page), `e2e`

## Context

The work's page the owner approved in the first prototype set the story beside the detail it talks about, captioned. The store never drew it: the CMS held each story's detail as a point and a zoom, which the journal's cards use (ADR 0043), and no words for it. A figure needs a text alternative for whoever cannot see it, and the caption the prototype had.

## Decision

- **One detail per story, in two places.** The point and zoom an editor chose show up close on the story's card, as before, and beside the story on the work's page, in a 5:4 frame, with its caption under it. On a phone it follows the text.
- **The words live in the detail, in both languages.** Two localized fields join its group in the CMS: `alt`, the detail in a sentence, and `caption`, a line. Neither is required: the work's page shows the figure once both are written, and the card needs neither, since its image sits beside the work's name.
- **The detail is cut from the whole master.** At a zoom of 3 the image is drawn three times the frame's width, wider than the page preset's 1,280 px, so the figure asks for the `zoom` preset, below the fold and loaded lazily.
- **The gateway passes the words on as they are.** `StoryDetail` gains `alt` and `caption`, both nullable: a story written before them has its point and no words, and the store leaves its figure out.
- **The seed writes them, and gives them to a story an older seed wrote.** Only while the story's point is still the seed's, since the words describe that part of the print, and never over a draft an editor has pending. Each was written looking at its crop as the store cuts it, and says only what the print shows or what the story's source says.

## Consequences

- A story whose editor moves its point loses its figure until someone writes the words for the new one.
- The e2e's preview checks leave drafts of three stories. On a stack where they ran before this change, the seed leaves those three alone, and their pages show no figure until the drafts are published or thrown away.
- The figure's image is up to 2,400 px wide, heavier than the page's own.

## Rejected

- **A second image per story, cropped and uploaded**: two files to keep in step with the scan, where a point and a zoom cut the detail out of the one master.
- **Words required whenever a point is set**: an editor could not save a story halfway, and every story written before would fail on its next save.
- **An alternative made from the record**, such as "Detail of Melencolia I": it names the work and says nothing of what the detail shows.
