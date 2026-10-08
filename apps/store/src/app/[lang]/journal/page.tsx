import { Band, PageHead, SectionHead, StoryCard, StoryGrid, StoryLead } from '@deckle/ui';
import { tokens as t } from '@deckle/tokens';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import styled from 'styled-components';
import { getCopy } from '../../../copy/server';
import { readJournal } from '../../../gateway/reads';
import { journalOf, storyHref } from '../../../views/journal';

const Lead = styled.div`
  margin-block-start: ${t.space.gap2xl};
`;

export async function generateMetadata(): Promise<Metadata> {
  const { journal: text } = await getCopy();
  return { title: text.title };
}

/** Every story, the newest first and widest, as approved. Each leads to its print's page. */
export default async function JournalPage() {
  const { journal: text } = await getCopy();
  return (
    <Suspense
      fallback={
        <Band aria-labelledby="journal-title" aria-busy="true">
          <PageHead id="journal-title" title={text.title} lede={text.lede} />
        </Band>
      }
    >
      <Journal />
    </Suspense>
  );
}

async function Journal() {
  const copy = await getCopy();
  const { journal: text } = copy;
  await connection();
  const { artworks } = await readJournal(copy.lang);
  const [first, ...rest] = journalOf(artworks.edges.map((edge) => edge.node));

  return (
    <>
      <Band aria-labelledby="journal-title">
        <PageHead id="journal-title" title={text.title} lede={text.lede} />
        {first && (
          <Lead>
            <StoryLead
              href={copy.path(storyHref(first.slug))}
              kicker={first.kicker}
              title={first.title}
              lede={first.lede}
              image={first.image}
              more={text.readBeside}
            />
          </Lead>
        )}
      </Band>

      {rest.length > 0 && (
        <Band tone="band" aria-labelledby="more-stories-title">
          <SectionHead id="more-stories-title" title={text.more} />
          <StoryGrid>
            {rest.map((entry) => (
              <li key={entry.slug}>
                <StoryCard
                  href={copy.path(storyHref(entry.slug))}
                  kicker={entry.kicker}
                  title={entry.title}
                  lede={entry.lede}
                  image={entry.image}
                />
              </li>
            ))}
          </StoryGrid>
        </Band>
      )}
    </>
  );
}
