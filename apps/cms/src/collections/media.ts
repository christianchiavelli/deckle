import path from 'node:path';
import type { CollectionConfig } from 'payload';
import { anyone, writeContent } from '../access/rules';

/**
 * Where uploads land. The image runs the server from `/app/apps/cms`, so this
 * is `/app/apps/cms/media` there: the path compose mounts a volume on.
 */
export const mediaDir = path.resolve(process.cwd(), 'media');

/** Editorial images: photographs and details the stories and drop pages use. */
export const media: CollectionConfig = {
  slug: 'media',
  access: {
    read: anyone,
    create: writeContent,
    update: writeContent,
    delete: writeContent,
  },
  upload: {
    staticDir: mediaDir,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'What the image shows, for readers who cannot see it.' },
    },
  ],
};
