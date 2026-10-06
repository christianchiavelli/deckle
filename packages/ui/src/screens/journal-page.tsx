import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Band, SectionHead } from '../sections/band.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { StoryCard, StoryGrid, StoryLead } from '../sections/story-card.tsx';
import { Chrome } from './chrome.tsx';
import { imageOf, stories } from './fixtures.ts';

const Lead = styled.div`
  margin-block-start: ${t.space.gap2xl};
`;

/**
 * Every story the editor wrote, the newest first and widest. A story lives on
 * its print's page, under the buy box, so each card leads there.
 */
export function JournalPage() {
  const [first, ...rest] = stories;
  if (!first) {
    throw new Error('No stories in the fixtures');
  }

  return (
    <Chrome current="journal">
      <Band aria-labelledby="journal-title">
        <PageHead
          id="journal-title"
          title="Journal"
          lede="Short pieces on the works: who made them, how, and what to look for. Every fact comes from The Met’s record, which each one cites."
        />
        <Lead>
          <StoryLead
            href={`/prints/${first.work.slug}#story`}
            kicker={first.title}
            title={first.work.shortTitle}
            lede={first.lede}
            image={{ ...imageOf(first.work), detail: first.detail }}
            more="Read it beside the print"
          />
        </Lead>
      </Band>

      <Band tone="band" aria-labelledby="more-stories-title">
        <SectionHead id="more-stories-title" title="More stories" />
        <StoryGrid>
          {rest.map((story) => (
            <li key={story.work.slug}>
              <StoryCard
                href={`/prints/${story.work.slug}#story`}
                kicker={story.title}
                title={story.work.shortTitle}
                lede={story.lede}
                image={{ ...imageOf(story.work), detail: story.detail }}
              />
            </li>
          ))}
        </StoryGrid>
      </Band>
    </Chrome>
  );
}
