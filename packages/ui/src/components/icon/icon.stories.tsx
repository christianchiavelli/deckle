import { tokens as t } from '@deckle/tokens';
import preview from '#storybook/preview';
import { Icon } from './icon.tsx';
import { iconNames } from './icons.tsx';

const meta = preview.meta({
  title: 'Components/Icon',
  component: Icon,
  // `as const`: CSF Next widens a literal in meta args, and the story would then ask for it again.
  args: { name: 'bag' as const },
});

/** Every icon, drawn for Deckle. They take the colour of the text around them. */
export const Set = meta.story({
  render: (args) => (
    <ul
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(6rem, 1fr))',
        gap: t.space.gapMd,
      }}
    >
      {iconNames.map((name) => (
        <li
          key={name}
          style={{
            display: 'grid',
            justifyItems: 'center',
            gap: t.space.gapXs,
            padding: t.space.gapMd,
            borderRadius: t.radius.control,
            background: t.surface.band,
            color: t.text.secondary,
            fontSize: '0.75rem',
          }}
        >
          <span style={{ color: t.icon.primary }}>
            <Icon {...args} name={name} />
          </span>
          {name}
        </li>
      ))}
    </ul>
  ),
});

/** Regular beside a heading or alone in a button, small beside body text, tiny in a chip or a crumb. */
export const Sizes = meta.story({
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: t.space.gapLg }}>
      <Icon name="ppi" />
      <Icon name="ppi" size="small" />
      <Icon name="ppi" size="tiny" />
    </div>
  ),
});

/** Alone and meaningful, an icon takes a label and becomes an image to a screen reader. */
export const Labelled = meta.story({
  args: { name: 'open', label: 'Public domain' },
});
