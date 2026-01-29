import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { ContainerRegistrationKeys, FeatureFlag, isPresent, QueryContext } from '@medusajs/framework/utils';

import { attachBatchInventoryQuantities } from './variant-batch-inventory';
import { attachVariantPrices, wrapProductsWithTaxPrices } from './helpers';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (FeatureFlag.isFeatureEnabled('index_engine')) {
    if (
      isPresent(req.filterableFields.tags) ||
      isPresent(req.filterableFields.categories) ||
      isPresent((req.filterableFields as Record<string, unknown>).category_id)
    ) {
      return await getProducts(req, res);
    }
    return await getProductsWithIndexEngine(req, res);
  }

  return await getProducts(req, res);
};

const normalizeFields = (req: MedusaRequest) => {
  const includesInventory = req.queryConfig.fields.some((field) => field.includes('variants.inventory_quantity'));
  if (includesInventory) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes('variants.inventory_quantity'),
    );
  }
  if (!req.queryConfig.fields.includes('variants.price_set.prices')) {
    req.queryConfig.fields.push('variants.price_set.prices');
  }
  return includesInventory;
};

const attachBatchTotalsForProducts = async (
  req: MedusaRequest,
  products: any[],
  options: { includeInventory?: boolean; includeAtPrice?: boolean } = {},
) => {
  const variants = products.map((product) => product.variants ?? []).flat(1);
  if (!variants.length) {
    return;
  }
  await attachBatchInventoryQuantities(req.scope, variants, options);
};

const attachPricesForProducts = (products: any[]) => {
  const variants = products.map((product) => product.variants ?? []).flat(1);
  if (!variants.length) {
    return;
  }
  attachVariantPrices(variants);
};

async function getProductsWithIndexEngine(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const context: Record<string, unknown> = {};

  const includesInventory = normalizeFields(req);

  if (isPresent(req.pricingContext)) {
    context.variants ??= {};
    (context.variants as Record<string, unknown>).calculated_price = QueryContext(req.pricingContext);
  }

  const filters = req.filterableFields;
  if (isPresent(filters.sales_channel_id)) {
    const salesChannelIds = filters.sales_channel_id;
    filters.sales_channels ??= {};
    (filters.sales_channels as Record<string, unknown>).id = salesChannelIds;
    delete filters.sales_channel_id;
  }

  const { data: products = [], metadata } = await query.index(
    {
      entity: 'product',
      fields: req.queryConfig.fields,
      filters,
      pagination: req.queryConfig.pagination,
      context,
    },
    {
      cache: {
        enable: true,
      },
    },
  );

  await attachBatchTotalsForProducts(req, products, {
    includeInventory: includesInventory,
    includeAtPrice: false,
  });
  attachPricesForProducts(products);
  await wrapProductsWithTaxPrices(req, products);

  res.json({
    products,
    count: metadata.estimate_count,
    estimate_count: metadata.estimate_count,
    offset: metadata.skip,
    limit: metadata.take,
  });
}

async function getProducts(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const context: Record<string, unknown> = {};

  const includesInventory = normalizeFields(req);

  if (isPresent(req.pricingContext)) {
    context.variants ??= {};
    (context.variants as Record<string, unknown>).calculated_price = QueryContext(req.pricingContext);
  }

  const { data: products = [], metadata } = await query.graph(
    {
      entity: 'product',
      fields: req.queryConfig.fields,
      filters: req.filterableFields,
      pagination: req.queryConfig.pagination,
      context,
    },
    {
      cache: {
        enable: true,
      },
    },
  );

  await attachBatchTotalsForProducts(req, products, {
    includeInventory: includesInventory,
    includeAtPrice: false,
  });
  attachPricesForProducts(products);
  await wrapProductsWithTaxPrices(req, products);

  res.json({
    products,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  });
}
