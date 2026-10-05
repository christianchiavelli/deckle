# Upstream API reference

Notes gathered by probing The Met's collection API and image host live on 5 October 2026. This file is the source of truth for the contracts `@deckle/met` wraps, because the published documentation leaves out most of what the code has to handle, and The Met changed its search four days before these probes.

## Why The Met

Deckle sells prints, so it needs images it may sell, at a resolution worth printing, from a source a script can reach. The Met flags every object `isPublicDomain`, and its Open Access images are CC0 and download without a block. The Art Institute of Chicago was the other candidate: its data API answers (`api.artic.edu`, 200), but its IIIF image server sits behind a Cloudflare challenge for automated clients. On 5 October it answered both an image and its `info.json` with `403` and `cf-mitigated: challenge` to curl, and served Playwright's Chromium the same 403 with a Turnstile page; an importer that has to pass a challenge for every image is not one to build on.

## Two hosts, two contracts

| Concern | Collection API `collectionapi.metmuseum.org/public/collection` | Image host `images.metmuseum.org/CRDImages` |
| --- | --- | --- |
| What it is | JSON, served by IIS through ARR (`X-Powered-By: ARR/3.0, ASP.NET`) | Static JPEG files on IIS 10 |
| In front of it | Imperva (`X-CDN: Imperva`), which sets `visid_incap_*` and `incap_ses_*` cookies on every response | Imperva too, as a separate site, cookies marked `Secure; SameSite=None` |
| Caching headers | None: no `Cache-Control`, `ETag` or `Last-Modified` | `Cache-Control: max-age=432000` (five days), `ETag`, `Last-Modified`; `304` to `If-None-Match` and `If-Modified-Since` |
| CORS | `Access-Control-Allow-Origin: *` when the request sends an `Origin`; preflight `204` | `Access-Control-Allow-Origin: *` on every response |
| Range requests | Not offered; `HEAD` is a `405` | `Accept-Ranges: bytes`, `206` with `Content-Range`, `416` past the end |
| Compression | gzip when asked | none (JPEG) |
| Errors | JSON `{ "message": … }`, once a bare JSON string | an HTML 404 page |
| An unknown id | `404 {"message":"ObjectID not found"}` | `404`, HTML |

Node's `fetch` reaches both, with or without a `User-Agent`; the client sends one anyway (see Rate limits and etiquette).

## Search moved to v1.1 on 1 October

`GET /v1/search` now answers every query with `410 Gone`:

```json
{
  "message": "/public/collection/v1/search was retired on 2026-10-01. It was backed by Solr and returned every matching object ID in one response; use /public/collection/v1.1/search, which is Elastic-backed and paginated via offset and limit. To enumerate the whole collection, use /public/collection/v1/objects or the Open Access CSV dataset.",
  "replacement": "/public/collection/v1.1/search",
  "documentation": "https://metmuseum.github.io/"
}
```

`/v1.1/search` takes the same filters plus `offset` (zero-based) and `limit`, returns `{ total, objectIDs }` and needs no `q`. The documentation states the limits; the probes show how each is enforced, and none of them is an error:

```
GET /v1.1/search?q=durer                          -> 200, total 1176, 100 ids (the default page)
    &limit=500                                    -> 500 ids
    &limit=501, &limit=1000                       -> 500 ids, capped without a word
    &limit=0, &limit=-1                           -> 100 ids, the default
    &offset=-1&limit=5                            -> the first 5, as if offset were 0
    &offset=1175&limit=5                          -> 1 id
    &offset=1176&limit=5                          -> {"total":1176,"objectIDs":null}

GET /v1.1/search?hasImages=true                   (total 370,999)
    &offset=9999&limit=2                          -> 1 id: the window ends at 10,000
    &offset=9501&limit=500                        -> 499 ids
    &offset=10000&limit=1                         -> objectIDs null
```

A page past the last match carries `objectIDs: null`, not `[]`, and a page that crosses the 10,000th result is cut short rather than refused. The client refuses such a page itself, so a short page always means the end of the matches.

## The filters fail silently

Every filter that is misspelt, mis-cased or unknown is dropped, and the search quietly runs over the whole collection:

| Request                                            | `total`                               |
| -------------------------------------------------- | ------------------------------------- |
| no filter at all                                   | 536,265                               |
| `hasImages=true` / `hasImages=false`               | 370,999 / 165,266                     |
| `hasImages=True`                                   | 536,265: the flags are case-sensitive |
| `isPublicDomain=true`, `=false`, `=TRUE` or `=yes` | 536,265: not a search filter at all   |
| `hasImages=true&isPublicDomain=false`              | 370,999                               |
| `departmentId=999`, `departmentId=abc`             | 536,265                               |
| `q=durer&dateBegin=1500` (no `dateEnd`)            | 1,176, the same as `q=durer`          |
| `q=durer&medium=Engraving` / `medium=Engravings`   | 499 / 0: an exact term                |

So whether a work is public domain can only be read on the object itself, which is where the importer reads it. `q` ignores case but not accents (`durer` 1,176, `dürer` 1,187), and `artistOrCulture=true` narrows either spelling to the same 847. Without `q`, results come back in object-id order as text: `1, 10, 100, 1000, 10000, 100001…`.

Responses carry `X-Search-Cache: MISS`, then `HIT` for the same request; the key is the literal query string, so swapping two parameters or changing the case of `q` misses again.

## `total` is exact, but the index is not the collection

`total` held steady across pages and is not capped: 370,999 for `hasImages=true`, far past the 10,000 that can be paged to. It counts the search index, though, and that index is larger than the collection `/v1/objects` lists (502,886 ids against 536,265 matches with no filter; 185,098 against 213,769 for Drawings and Prints). In nine pages of 500 hits from different searches, 18 ids of 4,500 were missing from `/v1/objects`, and every one of the ten fetched answered `404 {"message":"Not a valid object"}`: the search still lists records that were withdrawn.

`hasImages=true` does not promise an image either: of 315 records sampled from `hasImages=true` searches, 33 had no `primaryImage`, because their image is not Open Access.

## Field-level hazards

Figures from 315 records sampled on 5 October from `hasImages=true` searches for engraving, etching, woodcut, lithograph, mezzotint and aquatint in Drawings and Prints (262) and woodblock in Asian Art (53). Median response 0.31 s, 95th percentile 0.78 s.

- Text fields are never `null`: an unknown value is `""`. `culture` was empty on all 262 Drawings and Prints records, `period` on 266 of 315, `artistBeginDate` on 56, `artistDisplayBio` on 16, `objectDate` on 5, `dimensions` on 2. The normaliser turns every empty string into `null`.
- The arrays are less consistent: `tags` was `null` on 54 records and never `[]`; `constituents` was `null` on 3, the same 3 with no artist at all; `measurements` was `null` on 8; `additionalImages` was always an array.
- `isPublicDomain` was false on 33 records, every one without an image, and no record flagged true lacked one. The flag is conservative and does not follow age: false for Katsukawa Shunchō (1799), Käthe Kollwitz (1899) and Mary Cassatt's _The Letter_ (352204, 1890–91, no image fields at all), and not one of the 87 Drawings and Prints objects the search finds for Cassatt comes with a public-domain image. Deckle sells only what the flag allows.
- `dimensions` puts one element per line (plate, sheet, image, mount), always separated by CRLF: 240 records had one line, 60 two, 11 three, 2 four. The catalog keeps them as an array.
- `measurements` is not a parsed copy of `dimensions`. Its labels can be wrong (Melencolia I, 336228, gives `Depth: 24, Height: 18.5` for a plate of 24 × 18.5 cm) and it can hold elements `dimensions` never mentions (The Rhinoceros, 356497, has a `Framed` element of 40.6 × 53.3 cm). The catalog keeps the text.
- `objectDate` is free text: `1514`, `ca. 1830–32`, `ca.1830–31`, `19th century`, `June 12, 1878`, `by 1818 (possibly 1814–18)`, `1881 (Meiji 14)`, `n.d.`. Beside it, `objectBeginDate` and `objectEndDate` are integers that can be much wider than the text: of 51 dates starting `ca.`, 27 were widened by ten years each side, 16 by five, and 2 not at all, so _Under the Wave off Kanagawa_ (`ca. 1830–32`) carries 1820–1842 while _Storm below Mount Fuji_ from the same series, with the same text, carries 1830–1832. An `n.d.` record carried 1495–1987, and an empty `objectDate` came with 1450–1503. The catalog keeps the text to show and the integers to sort by, and reads `n.d.` as no date.
- `artistDisplayName` is whoever comes first among the constituents, not always the maker: `artistRole` was `Publisher` on 70 records, and `artistPrefix` was filled on 60 (`Issued by` 40, `After` 7 and `after` 1, `Designed and etched by` 5, `Attributed to` 4, `Drawn and etched by` 2, `(?)` 1). An unknown hand is named, as `Anonymous, Italian, 18th century`, with an empty bio (12 records). The importer refuses a curated work whose attribution is qualified, since the catalog has no field that would carry the doubt.
- `constituents[].name` is HTML-escaped and carries the prefix inline (`Issued by Allen &amp; Ginter`, 104 times in the sample), while the top-level fields are plain text (49 titles with a raw `&`). The normaliser reads the top-level fields.
- A search for engraving in Drawings and Prints also returns books (36 of the sample) and drawings (21), and `objectName` spells one kind of object three ways (`Books Prints Ornament & Architecture`, `Books, Prints, Ornament & Architecture`, `Book; Print; Ornament & Architecture`). The curation checks `classification`.
- Titles run to sentences: up to 301 characters, and 126 of 315 over 80. The catalog keeps The Met's title and adds a short one, written by hand.
- `metadataDate` comes with zero to three decimals of a second. Records change daily: 66 were updated on 5 October alone, 1,888 since 1 October.
- `artistGender` is `Female` or empty: the documentation says it only designates women.

## Absence is signalled six ways

| Request | HTTP | Body |
| --- | --- | --- |
| `/v1/objects/999999999`, `/0`, `/-1` | 404 | `{"message":"ObjectID not found"}` |
| `/v1/objects/101039`, a search hit since withdrawn | 404 | `{"message":"Not a valid object"}` |
| `/v1/objects/abc`, `/336228.5` | 400 | `{"message":"could not parse objectID"}` |
| `/v1/objects?metadataDate=notadate` | 400 | `"Date not valid. Dates must be in the format YYYY-MM-DD e.g. 1987-05-03"`, a bare JSON string |
| `/v1/objects?departmentIds=999` | 200 | `{"total":0,"objectIDs":[]}` |
| `/v1.1/search` past the last match | 200 | `{"total":…,"objectIDs":null}` |

The client turns the two 404s into `MetNotFoundError` with a `reason` of `unknown` or `withdrawn`. `HEAD` on an object is a `405` with `Allow: OPTIONS, GET`, although the CORS preflight lists `GET,HEAD,PUT,PATCH,POST,DELETE`.

## The rest of the API

- `/v1/objects` lists 502,886 ids, unordered (it starts at 508), in one 3.4 MB response that took 6.4 s. `departmentIds` and `metadataDate` narrow it.
- `/v1/departments` lists 19 departments, ids 1 to 21 without 2 and 20. Department 3 is now Ancient West Asian Art; the documentation's example still calls it Ancient Near Eastern Art.

## Images: originals, renditions and Range

`primaryImage` is the original and `primaryImageSmall` the "web-large" rendition, too small to print: for Melencolia I, 2,820 × 3,561 px and 4,391,204 bytes against 494 × 625 px and 148,710 bytes. The API gives neither image's size, so the client reads it from the file's header.

The image host answers Range requests with `206`, so the header can be read without downloading the file: `bytes=0-65535` brings back the first 64 KiB, `Content-Range: bytes 0-65535/4391204` gives the file's size, and the JPEG frame header in those bytes gives the pixels. The reader follows the segment lengths and can jump over long metadata with a second request, but none of the 48 curated originals needed one: their frame headers sat between byte 140 and byte 34,479. All 48 are baseline JPEGs with three channels, even the black-and-white prints, with no EXIF orientation; 13 embed an sRGB profile and 35 none. A range past the end is a `416` with `Content-Range: bytes */4391204`.

The originals are not the museum's masters. Of 434 Open Access originals probed while curating, none passed 4,000 px on its long edge and 55 were exactly 4,000, which reads as a cap on what is served. At 240 ppi, A1 needs at least 4,668 px along the side that sets the scale, whatever the image's shape, so no work from The Met can be sold at A1 today; near-square originals, with 3,213 px or more on their short side, reach A2.

## Rate limits and etiquette

The documentation asks for no key and says: "Please limit request rate to 80 requests per second." The CDN enforces something much lower. Four requests at a time, about ten a second, got this address a `403` from Imperva within ten seconds: an HTML page reading "Request unsuccessful. Incapsula incident ID", not JSON and not a 429. One request at a time at two a second was blocked after 80 requests in 45 s, and again after 81 with Imperva's cookies kept, so the cookies do not matter. One a second ran 150 requests, and later 240, without a block. Each block lifted within a minute. The image host is a separate Imperva site: it went on answering while the API was blocked.

So the client paces itself well under about 80 requests a minute:

- The API: one request at a time, at least a second apart, 60 a minute at most.
- The image host: two at a time, at least a second apart.
- Retries for network failures, timeouts, `429` and `5xx`: four, after a wait drawn at random below a ceiling that doubles from one second to a minute; a `Retry-After` is honoured up to that minute. After the CDN's `403` page it waits a minute first. Every retry is paced like any other request.
- A timeout per attempt, body included: 20 s for the API and the header probes, five minutes for an original.
- `User-Agent: Deckle/0.1 (+https://github.com/christianchiavelli/deckle)`, so The Met can tell who is calling.

An import of the 48 works reads 48 objects and downloads 48 originals (153 MB, 3.2 MB each on average) once; with the originals cached, a re-run makes 48 requests and takes about a minute.

## Endpoints we consume

```
GET collectionapi.metmuseum.org/public/collection/v1.1/search
    ?q=&hasImages=true&artistOrCulture=&title=&departmentId=&offset=&limit=
 -> { total, objectIDs: number[] | null }

GET collectionapi.metmuseum.org/public/collection/v1/objects/{objectID}
 -> { objectID, isPublicDomain, primaryImage, primaryImageSmall, title,
      artistDisplayName, artistDisplayBio, artistNationality, artistBeginDate, artistEndDate,
      artistPrefix, artistRole, constituents[] | null,
      objectDate, objectBeginDate, objectEndDate, medium, dimensions, classification,
      department, culture, period, creditLine, accessionNumber, objectURL, tags[] | null, ... }

GET images.metmuseum.org/CRDImages/{dept}/original/{file}.jpg
    Range: bytes=0-65535     (the header, for the pixel size)
    no Range                 (the original, once, into data/met/.cache)
```
