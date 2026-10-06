import { tokens as t } from '@deckle/tokens';
import preview from '#storybook/preview';
import { Logo } from './logo.tsx';

const meta = preview.meta({
  title: 'Components/Logo',
  component: Logo,
  args: { href: '/', 'aria-label': 'Deckle, home' },
});

/** In the header: the mark in copper. */
export const Default = meta.story();

/** In the footer, on the deep band: the mark takes the text's colour. */
export const OnDeep = meta.story({
  args: { onDeep: true },
  decorators: [
    (Story) => (
      <div
        style={{ padding: t.space.gapLg, borderRadius: t.radius.frame, background: t.surface.deep }}
      >
        <Story />
      </div>
    ),
  ],
});
