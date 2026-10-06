import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import { SearchField } from './search-field.tsx';

const meta = preview.meta({
  title: 'Components/Search field',
  component: SearchField,
  // Side by side, the same landmark is drawn once per theme; the screens check it is unique.
  parameters: { a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } } },
  args: {
    action: '/search',
    label: 'Search',
    placeholder: 'Search prints, artists and techniques',
    shortcut: '/',
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '26rem' }}>
        <Story />
      </div>
    ),
  ],
});

export const Default = meta.story();

/** Focused, the field lifts to the page and its border turns copper. */
export const Typing = meta.story({
  globals: { theme: 'light' },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('searchbox', { name: 'Search' });
    await userEvent.type(field, 'Hokusai');
    await expect(field).toHaveValue('Hokusai');
    await expect(canvas.getByRole('search')).toBeInTheDocument();
  },
});
