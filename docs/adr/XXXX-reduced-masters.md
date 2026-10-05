# XXXX. Reduced masters: WebP, 2,400 px, quality 60

- Status: accepted
- Date: 2026-10-05

## Context

The importer keeps each work's original out of the repository (`data/met/.cache`) and commits a reduced master to `data/met/images`. Every service reads the masters: commerce makes its product assets from them, and the store zooms into them. Print sizes never come from a master; they come from the original's pixels, recorded in the catalog.

The 48 curated originals weigh 153 MB together (3.2 MB on average), all baseline JPEGs with three channels, 1,566 to 4,000 px on their long edge; 13 embed an sRGB profile and 35 none. The masters are committed and baked into published images, so the data set was given a budget of about 25 MB, half a megabyte a work. Most of the works are engravings and etchings: dense hatching and paper grain, which is what costs bytes and what a zoom looks at.

## Decision

- **WebP, long edge 2,400 px, quality 60**, `effort: 6`, `smartSubsample: true`, through sharp 0.35.5 (libvips 8.18.7, libwebp 1.6.0). An original smaller than 2,400 px keeps its own size: nothing is enlarged.
- Each master is turned upright from its EXIF orientation, converted to sRGB, and keeps no metadata at all (no EXIF, XMP or ICC profile), sharp's default once nothing asks to keep it.
- The settings live in one constant, `MASTER` in `packages/met/src/import/master.ts`, and `data-set.spec.ts` checks every committed master against it, and the whole set against the budget.

The 48 masters weigh 23.9 MB (22.8 MiB), 486 KiB on average and 1,271 KiB for the heaviest, Piranesi's _The Drawbridge_.

## Measurements

Twelve originals chosen for their technique (dense engraving, woodcut, mezzotint, lithograph, colour woodblock, a hand-coloured lithograph), each encoded every way below. "SSIM, own size" compares a master with a lossless reduction of its original to the same size; "SSIM at 2,400" scales every master to a 2,400 px long edge first, which is what a zoom shows. Luma, 8 × 8 windows. The whole-set column is all 48 works.

| Setting | Average, 12 works | SSIM, own size | SSIM at 2,400 | All 48 works |
| --- | --- | --- | --- | --- |
| Lossless, 2,048 px (the baseline) | 7,195 KiB | 0.995 | 0.821 |  |
| JPEG (mozjpeg) q80, 2,048 px | 561 KiB | 0.930 | 0.823 | 24.1 MiB |
| WebP q75, 2,048 px | 507 KiB | 0.938 | 0.819 | 21.1 MiB |
| WebP q78, 2,048 px | 573 KiB | 0.947 | 0.824 | 23.9 MiB |
| WebP q70, 2,200 px | 535 KiB | 0.933 | 0.818 |  |
| WebP q70, 2,400 px | 618 KiB | 0.931 | 0.931 | 26.1 MiB |
| WebP q65, 2,400 px | 578 KiB | 0.926 | 0.925 | 24.4 MiB |
| **WebP q60, 2,400 px** | **542 KiB** | **0.919** | **0.919** | **22.8 MiB** |
| AVIF q55, 2,048 px | 355 KiB | 0.926 | 0.815 |  |

At its own size, WebP beat mozjpeg by about a fifth of the bytes for the same SSIM (in a first pass at 2,048 px, WebP q70 at 478 KiB scored as JPEG q82 at 598 KiB). Judged at the scale a zoom shows, resolution mattered far more than quality: a lossless 2,048 px master scored 0.821, below any 2,400 px master, because a reduction to 2,048 px merges the hatching that the zoom is there to show. For about the same bytes, 2,400 px at quality 60 kept 0.919 where 2,048 px at quality 78 kept 0.824. Side by side at 2:1, quality 60 smooths some paper grain and the finest speckle of a mezzotint, without blocking or banding; 2,048 px blurs the lines themselves.

## Consequences

- A product zoom has 2,400 px of the line work to show, and the data set stays at 24 MB for 48 works, below its budget with room for a few more.
- Masters are lossy twice over: commerce re-encodes its previews from them. Quality 60 leaves less headroom for that than 75 or 80 would; the previews are smaller than the master, which hides most of it.
- The bytes are deterministic for one sharp and libvips version, so a re-run changes nothing. Upgrading sharp may change every master's bytes and hash without any change in the data; that upgrade is followed by a re-run of the importer, reviewed as a diff of `catalog.json`.
- Every consumer must read WebP, which the catalog schema has allowed from the start (`jpg` or `webp`).

## Alternatives considered

- **JPEG (mozjpeg)**: read everywhere, but a fifth larger for the same fidelity; at 2,048 px, quality 80 used the whole budget.
- **2,048 px at a higher quality**: the long edge many shops zoom to, and better fidelity at its own size, but it loses the engraved line under zoom, which is the reason to zoom into a print.
- **AVIF**: about a quarter smaller again at a similar SSIM, but the catalog schema accepts `jpg` and `webp` only, and widening a contract three services already read is not a change to make for a few megabytes.
- **Committing the originals**: 153 MB in the repository and in every published image, for pixels only the print sizes need, and those are recorded in the catalog.
