import type { ReactNode } from 'react';
import type { RunFragment, WorkQuery } from '../gateway/generated';

type Blocks = NonNullable<NonNullable<WorkQuery['artwork']>['story']>['blocks'];

/** A run of text with its formatting: bold, italic, a link, or plain. */
function Run({ run }: { run: RunFragment }) {
  let node: ReactNode = run.text;
  if (run.italic) {
    node = <em>{node}</em>;
  }
  if (run.bold) {
    node = <strong>{node}</strong>;
  }
  return run.href === null ? node : <a href={run.href}>{node}</a>;
}

const runs = (text: readonly RunFragment[]) =>
  text.map((run, index) => <Run key={index} run={run} />);

/**
 * A story's body as the CMS keeps it (ADR 0025): paragraphs, headings and
 * quotes of formatted runs. The story's title is the band's h2, so a heading
 * inside it is an h3.
 */
export function StoryBody({ blocks }: { blocks: Blocks }) {
  return blocks.map((block, index) => {
    switch (block.__typename) {
      case 'ParagraphBlock':
        return <p key={index}>{runs(block.text)}</p>;
      case 'HeadingBlock':
        return <h3 key={index}>{runs(block.text)}</h3>;
      case 'QuoteBlock':
        return (
          <blockquote key={index}>
            <p>{runs(block.text)}</p>
          </blockquote>
        );
    }
  });
}
