import { defineMain } from '@storybook/nextjs-vite/node';
import { mergeConfig, type UserConfig } from 'vite';

export default defineMain({
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  // The typeface for Storybook's own chrome, which loads none of the store's CSS,
  // and the Met's images for the screens, as the importer wrote them.
  staticDirs: [
    { from: '../src/fonts', to: '/fonts' },
    { from: '../../../data/met/images', to: '/met' },
  ],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // Storybook's own getting-started checklist: this Storybook is for reviewing Deckle, not learning Storybook.
  features: { sidebarOnboardingChecklist: false },
  viteFinal: (config) =>
    mergeConfig(config, {
      build: {
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
