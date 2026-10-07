# 44. The search forgives a typo

- Status: accepted
- Date: 2026-10-07
- Versions: Next.js 16.3.8
- Scope: `apps/store/src/views/search.ts`

## Context

The search ADR 0043 shipped matched every word as a substring of the record, and found nothing for a word spelled another way. "melancolia" is how most people write the title of Dürer's _Melencolia I_, and it found nothing. So did "rembrant", "hokusia" and "kanagwa". The page then said the shop has nothing of the kind, about a print it sells.

Substrings also matched inside words, so "graph" found every lithograph, while a word cut short, which a search box is full of, had no rank of its own.

## Decision

- **Every searched word must match, at its best of three ways**: the whole word, the start of a word ("rembr" for Rembrandt), or a word within a few edits of it. An edit is a letter added, dropped or changed, or two neighbours swapped (optimal string alignment), so "hokusia" is one from "hokusai".
- **The edits a word may carry grow with it**: none up to three letters, where one changed letter makes another word ("wve" is not "wave"), one up to seven, two from eight. None in the first letter, where a typo is rare and allowing one matches words that only rhyme.
- **Only a word no record holds may be a typo.** "witch" is the start of "witches", so it is taken as meant, and does not also find every "with" one letter away. "melancolia" is in no record, so it finds "melencolia".
- **The closest come first**: a whole word before a start, a start before a typo, a title or a maker before a technique, and a technique before a medium or a culture; then, as before, the oldest.
- **The last word may still be being typed**, so from six letters it may be a start with one typo in it: "melanc" is on its way to "melencolia". Five letters are too few to tell a slip from another word: "monet" would find "monsters". At first only the suggestions read it so; ADR 0045 gives the search page the same reading, so their counts agree.

## Consequences

- "melancolia", "rembrant", "hokusia", "kanagwa" and "brige" find what they meant; "monet" and "gogh" still find nothing, which is true of the shop.
- It is still one pass over 48 cached works, with no index to keep.
- A word inside another is no longer found: "graph" does not find a lithograph. A search box is typed from the start of a word.
- There is no stemming beyond a word's start: "printing" does not find "printed". With titles, makers and techniques to search, a start and a typo cover what people type.

## Rejected

- **`pg_trgm` or Vendure's search index through the gateway**: the right tools past one page of works, as ADR 0043 says, and a second query shape and an index to keep for 48.
- **A library such as Fuse.js**: a ranking that is a score between 0 and 1, tuned by thresholds, for a rule this page can state in five lines and test word by word.
- **Typos in every word, known or not**: "witch" found the witches and three prints with "with" in their title or medium.
