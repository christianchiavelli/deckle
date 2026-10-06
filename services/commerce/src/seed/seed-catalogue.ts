import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import type { Catalog, Work } from '@deckle/met';
import { PAPER_SIZE_ORDER, type PaperSize } from '@deckle/print-sizes';
import type { INestApplicationContext } from '@nestjs/common';
import { GlobalFlag } from '@vendure/common/lib/generated-types';
import {
  AssetService,
  CollectionService,
  FacetService,
  FacetValueService,
  isGraphQlErrorResult,
  LanguageCode,
  Logger,
  Product,
  ProductOptionGroupService,
  ProductOptionService,
  ProductService,
  ProductVariantService,
  TransactionalConnection,
  type Facet,
  type ID,
  type RequestContext,
} from '@vendure/core';
import { In } from 'typeorm';
import {
  centuryOf,
  FACETS,
  facetValuesOf,
  imageTypeOf,
  labelOf,
  OPEN_EDITION,
  productCustomFieldsOf,
  variantsOf,
  type FacetCode,
  type FacetValueRef,
} from './catalogue-mapping.js';

const en = LanguageCode.en;
const loggerCtx = 'Seed';

export const PAPER_SIZE_GROUP = 'paper-size';

export interface CatalogueSeedReport {
  facetsCreated: number;
  facetValuesCreated: number;
  productsCreated: number;
  variantsCreated: number;
  /** Works already in the catalogue, found by their Met object id. */
  productsSkipped: number;
  /** Works whose scan cannot print even an A4 at the minimum resolution. */
  unsellable: number[];
  collectionsCreated: number;
}

const valueKey = (facet: FacetCode, code: string) => `${facet}:${code}`;

function required<K>(ids: ReadonlyMap<K, ID>, key: K, what: string): ID {
  const id = ids.get(key);
  if (id === undefined) {
    throw new Error(`The seed has no id for ${what}`);
  }
  return id;
}

interface PaperSizes {
  readonly groupId: ID;
  readonly optionIds: ReadonlyMap<PaperSize, ID>;
}

interface CollectionPlan {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly facetValueIds: ID[];
  readonly parentSlug: string | null;
}

/**
 * The catalogue from the data set: facets, the shared "Paper size" option group, one
 * product per work with its image and variants, and the collections. Only what is
 * missing is created; a work is recognised by its Met object id, including one an
 * editor has since deleted, so a second run changes nothing.
 */
export class CatalogueSeeder {
  private readonly report: CatalogueSeedReport = {
    facetsCreated: 0,
    facetValuesCreated: 0,
    productsCreated: 0,
    variantsCreated: 0,
    productsSkipped: 0,
    unsellable: [],
    collectionsCreated: 0,
  };

  constructor(
    private readonly app: INestApplicationContext,
    private readonly ctx: RequestContext,
    private readonly taxCategoryId: ID,
  ) {}

  async seed(catalog: Catalog, catalogDir: string): Promise<CatalogueSeedReport> {
    const paperSizes = await this.paperSizes();
    const facetValueIds = await this.facetValues(catalog.works);
    await this.products(catalog.works, catalogDir, paperSizes, facetValueIds);
    await this.collections(catalog.works, facetValueIds);
    return this.report;
  }

  /** One option group shared by every product (Vendure 3.6+), with an option per size. */
  private async paperSizes(): Promise<PaperSizes> {
    const groupService = this.app.get(ProductOptionGroupService);
    const optionService = this.app.get(ProductOptionService);
    const found = await groupService.findAll(
      this.ctx,
      { filter: { code: { eq: PAPER_SIZE_GROUP } } },
      ['options'],
    );
    const existing = found.items[0];
    const group =
      existing ??
      (await groupService.create(this.ctx, {
        code: PAPER_SIZE_GROUP,
        translations: [{ languageCode: en, name: 'Paper size' }],
      }));
    const options = existing?.options ?? [];
    const optionIds = new Map<PaperSize, ID>();
    for (const size of PAPER_SIZE_ORDER) {
      const code = size.toLowerCase();
      const option =
        options.find((candidate) => candidate.code === code) ??
        (await optionService.create(this.ctx, group, {
          code,
          translations: [{ languageCode: en, name: size }],
        }));
      optionIds.set(size, option.id);
    }
    return { groupId: group.id, optionIds };
  }

  private async facetValues(works: readonly Work[]): Promise<Map<string, ID>> {
    const facetService = this.app.get(FacetService);
    const facetValueService = this.app.get(FacetValueService);
    const facets = new Map<FacetCode, Facet>();
    const ids = new Map<string, ID>();

    for (const definition of FACETS) {
      let facet = await facetService.findByCode(this.ctx, definition.code, en);
      if (!facet) {
        facet = await facetService.create(this.ctx, {
          code: definition.code,
          isPrivate: false,
          translations: [{ languageCode: en, name: definition.name }],
        });
        this.report.facetsCreated++;
      }
      facets.set(definition.code, facet);
      for (const value of facet.values) {
        ids.set(valueKey(definition.code, value.code), value.id);
      }
    }

    const wanted = new Map<string, FacetValueRef>();
    for (const value of works.flatMap(facetValuesOf)) {
      wanted.set(valueKey(value.facet, value.code), value);
    }
    for (const [key, value] of wanted) {
      const facet = facets.get(value.facet);
      if (ids.has(key) || !facet) {
        continue;
      }
      const created = await facetValueService.create(this.ctx, facet, {
        code: value.code,
        translations: [{ languageCode: en, name: value.name }],
      });
      ids.set(key, created.id);
      this.report.facetValuesCreated++;
    }
    return ids;
  }

  private async products(
    works: readonly Work[],
    catalogDir: string,
    paperSizes: PaperSizes,
    facetValueIds: ReadonlyMap<string, ID>,
  ): Promise<void> {
    const connection = this.app.get(TransactionalConnection);
    // Soft-deleted products keep their row, so a work an editor removed stays removed.
    const existing = await connection.rawConnection.getRepository(Product).find({
      select: { id: true, customFields: { metObjectId: true } },
      where: { customFields: { metObjectId: In(works.map((work) => work.objectId)) } },
    });
    const seeded = new Set(existing.map((product) => product.customFields.metObjectId));

    for (const work of works) {
      if (seeded.has(work.objectId)) {
        this.report.productsSkipped++;
        continue;
      }
      const variants = variantsOf(work);
      if (variants.length === 0) {
        Logger.warn(
          `Skipped ${work.slug}: its ${work.image.originalWidth} × ${work.image.originalHeight} px scan cannot print an A4`,
          loggerCtx,
        );
        this.report.unsellable.push(work.objectId);
        continue;
      }
      // One transaction per work: a failure leaves no product without variants behind,
      // which the next run would otherwise skip as already seeded.
      await connection.withTransaction(this.ctx, async (ctx) => {
        const imagePath = join(catalogDir, 'images', work.image.file);
        // The type is stated rather than left to Vendure's guess from the name, which
        // falls back to an untyped file it would then refuse.
        const asset = await this.app.get(AssetService).create(ctx, {
          file: {
            createReadStream: () => createReadStream(imagePath),
            filename: work.image.file,
            mimetype: imageTypeOf(work.image.file),
            encoding: '7bit',
          },
        });
        if (isGraphQlErrorResult(asset)) {
          throw new Error(`Could not store ${imagePath}: ${asset.message}`);
        }
        const product = await this.app.get(ProductService).create(ctx, {
          enabled: true,
          featuredAssetId: asset.id,
          assetIds: [asset.id],
          facetValueIds: facetValuesOf(work).map((value) =>
            required(
              facetValueIds,
              valueKey(value.facet, value.code),
              `the ${value.facet} "${value.name}"`,
            ),
          ),
          translations: [
            {
              languageCode: en,
              name: work.shortTitle,
              slug: work.slug,
              description: labelOf(work),
            },
          ],
          customFields: productCustomFieldsOf(work),
        });
        await this.app
          .get(ProductService)
          .addOptionGroupToProduct(ctx, product.id, paperSizes.groupId);
        await this.app.get(ProductVariantService).create(
          ctx,
          variants.map((variant) => ({
            productId: product.id,
            sku: variant.sku,
            price: variant.price,
            taxCategoryId: this.taxCategoryId,
            optionIds: [required(paperSizes.optionIds, variant.size, `the ${variant.size} option`)],
            // Open editions are printed to order; there is no stock to count.
            trackInventory: GlobalFlag.FALSE,
            translations: [{ languageCode: en, name: variant.name }],
            customFields: variant.customFields,
          })),
        );
      });
      this.report.productsCreated++;
      this.report.variantsCreated += variants.length;
    }
  }

  /**
   * "All prints" holds every open edition; under it, "By technique" and "By century"
   * group one collection per facet value in the data set. Children inherit the parent's
   * filter, so a technique collection never lists something "All prints" does not.
   */
  private async collections(
    works: readonly Work[],
    facetValueIds: ReadonlyMap<string, ID>,
  ): Promise<void> {
    const plans: CollectionPlan[] = [
      {
        slug: 'all-prints',
        name: 'All prints',
        description: 'Every open-edition print in the shop.',
        facetValueIds: [
          required(facetValueIds, valueKey('edition', OPEN_EDITION.code), 'the open edition'),
        ],
        parentSlug: null,
      },
      {
        slug: 'by-technique',
        name: 'By technique',
        description: 'The prints grouped by how the original was made.',
        facetValueIds: [],
        parentSlug: 'all-prints',
      },
      {
        slug: 'by-century',
        name: 'By century',
        description: 'The prints grouped by when the original was made.',
        facetValueIds: [],
        parentSlug: 'all-prints',
      },
    ];

    const techniques = new Map<string, FacetValueRef>();
    const centuries = new Map<string, { value: FacetValueRef; year: number }>();
    for (const work of works) {
      for (const value of facetValuesOf(work)) {
        if (value.facet === 'technique') {
          techniques.set(value.code, value);
        }
      }
      const century = centuryOf(work.date);
      const year = work.date.beginYear ?? work.date.endYear;
      if (century && year !== null && !centuries.has(century.code)) {
        centuries.set(century.code, { value: { facet: 'century', ...century }, year });
      }
    }
    const childPlan = (
      value: FacetValueRef,
      parentSlug: string,
      description: string,
    ): CollectionPlan => ({
      slug: value.code,
      name: value.name,
      description,
      facetValueIds: [
        required(
          facetValueIds,
          valueKey(value.facet, value.code),
          `the ${value.facet} "${value.name}"`,
        ),
      ],
      parentSlug,
    });
    for (const value of [...techniques.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      plans.push(
        childPlan(
          value,
          'by-technique',
          `Prints of originals made as ${value.name.toLowerCase()}.`,
        ),
      );
    }
    for (const { value } of [...centuries.values()].sort((a, b) => a.year - b.year)) {
      plans.push(childPlan(value, 'by-century', `Prints of originals made in the ${value.name}.`));
    }

    const collectionService = this.app.get(CollectionService);
    const ids = new Map<string, ID>();
    for (const plan of plans) {
      const found = await collectionService.findOneBySlug(this.ctx, plan.slug);
      if (found) {
        ids.set(plan.slug, found.id);
        continue;
      }
      const parentId = plan.parentSlug === null ? undefined : ids.get(plan.parentSlug);
      const created = await collectionService.create(this.ctx, {
        isPrivate: false,
        inheritFilters: plan.parentSlug !== null,
        ...(parentId === undefined ? {} : { parentId }),
        filters:
          plan.facetValueIds.length === 0
            ? []
            : [
                {
                  code: 'facet-value-filter',
                  arguments: [
                    {
                      name: 'facetValueIds',
                      value: JSON.stringify(plan.facetValueIds.map(String)),
                    },
                    { name: 'containsAny', value: 'false' },
                    { name: 'combineWithAnd', value: 'true' },
                  ],
                },
              ],
        translations: [
          { languageCode: en, name: plan.name, slug: plan.slug, description: plan.description },
        ],
      });
      ids.set(plan.slug, created.id);
      this.report.collectionsCreated++;
    }
  }
}
