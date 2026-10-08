import { defineMain } from '@storybook/nextjs-vite/node';
import { mergeConfig, type UserConfig } from 'vite';

export default defineMain({
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  // The favicon, the typeface for Storybook's own chrome, which loads none of
  // the store's CSS, and the Met's images for the screens.
  staticDirs: [
    { from: '../../brand/assets', to: '/' },
    { from: '../../../data/met/images', to: '/met' },
  ],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // Storybook's own getting-started checklist: this Storybook is for reviewing Deckle, not learning Storybook.
  features: { sidebarOnboardingChecklist: false },
  viteFinal: (config) =>
    mergeConfig(config, {
      build: {
        // The browsers that read light-dark() themselves. For older ones Lightning
        // CSS rewrites the tokens into variables set on :root, and the panes that
        // show a story in both themes switch `color-scheme` inline, which those
        // variables never follow: both panes would draw light.
        cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5', 'ios17.5'],
        // A static Storybook is fetched once per review, not per page view, so
        // its chunk sizes are not worth a warning on every build.
        chunkSizeWarningLimit: 4096,
        rolldownOptions: {
          onwarn(warning, warn) {
            // Next's own modules say "use client" for the App Router. A
            // Storybook bundle has no server components to keep apart.
            if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
              return;
            }
            warn(warning);
          },
        },
      },
    } satisfies UserConfig),
});
