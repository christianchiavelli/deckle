import { Band, ButtonLink, PageHead, SectionHead, Steps, typeRole } from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import type { Metadata } from 'next';
import styled from 'styled-components';
import { getCopy } from '../../../../../copy/server';

const Columns = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};

  @media ${media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${t.space.gap2xl} ${t.space.gap3xl};
  }

  h3 {
    ${typeRole('heading3')}
    margin-block-end: ${t.space.gapSm};
  }

  p {
    max-inline-size: 52ch;
    color: ${t.text.secondary};
  }
`;

const Closing = styled.div`
  display: grid;
  justify-items: start;
  margin-block-start: ${t.space.gap3xl};
`;

export async function generateMetadata(): Promise<Metadata> {
  const { howDrops: text } = await getCopy();
  return { title: text.title, description: text.lede };
}

/** How a drop runs, in three steps, and the rules that keep it fair. */
export default async function HowDropsWorkPage() {
  const copy = await getCopy();
  const { howDrops: text } = copy;
  return (
    <>
      <Band aria-labelledby="how-title">
        <PageHead id="how-title" title={text.title} lede={text.lede} />
      </Band>

      <Band tone="band" aria-labelledby="steps-title">
        <SectionHead id="steps-title" title={text.stepsTitle} />
        <Steps steps={text.steps} />
      </Band>

      <Band aria-labelledby="rules-title">
        <SectionHead id="rules-title" title={text.rulesTitle} />
        <Columns>
          {text.rules.map((rule) => (
            <div key={rule.title}>
              <h3>{rule.title}</h3>
              <p>{rule.text}</p>
            </div>
          ))}
        </Columns>
        <Closing>
          <ButtonLink href={copy.path('/drops')} variant="accent" icon="arrow">
            {text.see}
          </ButtonLink>
        </Closing>
      </Band>
    </>
  );
}
