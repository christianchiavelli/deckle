import preview from '#storybook/preview';
import { Breadcrumbs } from './breadcrumbs.tsx';

const meta = preview.meta({
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  // Side by side, the same landmark is drawn once per theme; the screens check it is unique.
  parameters: { a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } } },
  args: {
    label: 'Breadcrumb',
    items: [
      { label: 'Prints', href: '/prints' },
      { label: 'Engravings', href: '/collections/engravings' },
      { label: 'Albrecht Dürer', href: '/artists/albrecht-durer' },
    ],
  },
});

/** Above a work: the shop, the technique, the artist. */
export const Default = meta.story();
