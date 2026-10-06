/* From Payload's blank template (3.90.2), with its types written the way this repository lints them. */
import type { Metadata } from 'next';

import config from '@payload-config';
import { RootPage, generatePageMetadata } from '@payloadcms/next/views';
import { importMap } from '../importMap';

interface Args {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, params, searchParams, importMap });

export default Page;
