import type { LoggerService } from '@nestjs/common';
import type { CmsDropPage } from '../cms/cms.responses.js';
import { lexicalToBlocks } from '../cms/lexical/lexical-to-blocks.js';
import type { DropPage } from './drop.model.js';

/** A drop page as the CMS keeps it, as the store shows it; what could not be shown is logged. */
export function dropPageOf(page: CmsDropPage, logger: LoggerService): DropPage {
  const body = lexicalToBlocks(page.body);
  for (const warning of body.warnings) logger.warn(`The page of the drop ${page.slug}: ${warning}`);
  return { headline: page.headline, blocks: [...body.blocks] };
}
