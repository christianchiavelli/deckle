import type { VendureConfig } from '@vendure/core';
import { createVendureConfig } from '../vendure-config.js';
import { buildTimeEnv } from './build-time-env.js';

/**
 * What the dashboard build reads: Vendure's Vite plugin compiles this file, imports
 * it, and builds the Admin API schema from its custom fields and plugins. It looks for
 * an exported variable typed `VendureConfig`, hence the annotation.
 */
export const config: VendureConfig = createVendureConfig(buildTimeEnv, { process: 'tool' });
