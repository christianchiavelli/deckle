import { tokens as t } from '@deckle/tokens';
import addonA11y from '@storybook/addon-a11y';
import addonDocs from '@storybook/addon-docs';
import { definePreview, type Decorator } from '@storybook/nextjs-vite';
import { type ReactNode, useEffect } from 'react';
import '../src/styles/global.css';
import { theme as docsTheme } from './theme.ts';

type Theme = 'light' | 'dark' | 'both';

/**
 * The tokens switch on `color-scheme`, so a story shows one theme, as the
 * store does, or both side by side. Side by side is the default: a component
 * is reviewed, and audited by axe, in both themes at once.
 *
 * Each pane is its own form, so a radio group in one never reaches into the
 * other. Screens, which bring their own forms, show one theme at a time.
 */
interface PanesProps {
  theme: Theme;
  /** Screens run edge to edge; components sit on the page with room around them. */
  bleed: boolean;
  /** A story alone fills the window; on a docs page it takes only the room it needs. */
  fill: boolean;
  children: ReactNode;
}

function Panes({ theme, bleed, fill, children }: PanesProps) {
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme === 'both' ? 'light' : theme;
  }, [theme]);

  const schemes = theme === 'both' ? (['light', 'dark'] as const) : [theme];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(22rem, 100%), 1fr))',
        minBlockSize: fill ? '100dvh' : undefined,
      }}
    >
      {schemes.map((scheme) => {
        const style = {
          colorScheme: scheme,
          background: t.surface.page,
          color: t.text.primary,
          padding: bleed ? 0 : t.space.gapXl,
          minInlineSize: 0,
        };
        return theme === 'both' ? (
          <form key={scheme} data-theme-pane={scheme} style={style}>
            {children}
          </form>
        ) : (
          <div key={scheme} data-theme-pane={scheme} style={style}>
            {children}
          </div>
        );
      })}
    </div>
  );
}

const withTheme: Decorator = (Story, context) => (
  <Panes
    theme={(context.globals['theme'] ?? 'both') as Theme}
    bleed={context.parameters['bleed'] === true}
    fill={context.viewMode === 'story'}
  >
    <Story />
  </Panes>
);

export default definePreview({
  addons: [addonDocs(), addonA11y()],
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'both', title: 'Side by side' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'both' },
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    // An accessibility violation fails the story's test, not just a panel warning.
    a11y: { test: 'error' },
    backgrounds: { disable: true },
    docs: { theme: docsTheme },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Foundations',
          ['Colour', 'Type', 'Space', 'Radius', 'Motion', 'Grid', 'Contrast'],
          'Components',
          'Screens',
        ],
      },
    },
  },
});
