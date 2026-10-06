import preview from '#storybook/preview';
import { Chip } from './chip.tsx';

const meta = preview.meta({
  title: 'Components/Chip',
  component: Chip,
  args: { children: 'The Met’s scan · 2,820 × 3,561 px' },
});

/** A fact: the scan's size on the stage, a size's ppi on its tile. */
export const Neutral = meta.story();

/** What is about to open. */
export const Accent = meta.story({ args: { tone: 'accent', children: 'Opens in 3 days' } });

/** A quieter accent, beside a price. */
export const Soft = meta.story({ args: { tone: 'soft', children: 'A4 only' } });
