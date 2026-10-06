import { tokens as t } from '@deckle/tokens';
import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import { Missing } from './missing.tsx';

const meta = preview.meta({
  title: 'Components/Missing',
  component: Missing,
  args: { label: 'Not recorded' },
});

/** In a work's record, where The Met leaves a field empty. */
export const InARecord = meta.story({
  render: (args) => (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: '9rem minmax(0, 1fr)',
        gap: t.space.gapSm,
        maxInlineSize: '28rem',
      }}
    >
      <dt style={{ color: t.text.secondary }}>Medium</dt>
      <dd>Engraving</dd>
      <dt style={{ color: t.text.secondary }}>Culture</dt>
      <dd style={{ color: t.text.muted }}>
        <Missing {...args} />
      </dd>
    </dl>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Not recorded')[0]).toBeInTheDocument();
  },
});
