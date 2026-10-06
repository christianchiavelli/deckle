import preview from '#storybook/preview';
import { Note } from './note.tsx';

const meta = preview.meta({
  title: 'Components/Note',
  component: Note,
  args: {
    children:
      'A2 would need 3,213 px across the image. The Met’s scan has 2,820, and we never upscale.',
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '32rem' }}>
        <Story />
      </div>
    ),
  ],
});

/** Under the sizes, saying why the largest ones are out of reach. */
export const Default = meta.story();
