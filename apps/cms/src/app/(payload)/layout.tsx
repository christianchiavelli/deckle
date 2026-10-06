/* From Payload's blank template (3.90.2), with its types written the way this repository lints them. */
import config from '@payload-config';
import '@payloadcms/next/css';
// Deckle's tokens and typeface, for the theme in custom.scss.
import '@deckle/tokens/tokens.css';
import '@deckle/brand/fonts.css';
import type { ServerFunctionClient } from 'payload';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import React from 'react';

import { importMap } from './admin/importMap.js';
import './custom.scss';

interface Args {
  children: React.ReactNode;
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;
