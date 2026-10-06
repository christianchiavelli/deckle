import { tokens as t } from '@deckle/tokens';
import preview from '#storybook/preview';
import { TextLink } from './text-link.tsx';

const meta = preview.meta({
  title: 'Components/Text link',
  component: TextLink,
  args: { href: '#sizing', children: 'How we size prints' },
});

export const Accent = meta.story();

/** Onwards to another page. */
export const WithArrow = meta.story({ args: { children: 'See every print', icon: 'arrow' } });

/** Leaves the store for The Met's own record of the work. */
export const External = meta.story({
  args: {
    href: 'https://www.metmuseum.org/art/collection/search/336228',
    children: 'The record at The Met',
    icon: 'out',
    target: '_blank',
    rel: 'noreferrer',
  },
});

/** On the copper-dark band of a drop. */
export const OnFeature = meta.story({
  args: { tone: 'onFeature', children: 'How drops work', icon: 'arrow' },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: t.space.gapLg,
          borderRadius: t.radius.frame,
          background: t.surface.feature,
        }}
      >
        <Story />
      </div>
    ),
  ],
});
