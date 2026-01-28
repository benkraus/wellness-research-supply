import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MedusaError, QueryContext, isPresent } from '@medusajs/framework/utils';

import { attachBatchInventoryQuantities } from '../variant-batch-inventory';
import {
  attachVariantPrices,
  filterOutInternalProductCategories,
  refetchProduct,
  wrapProductsWithTaxPrices,
} from '../helpers';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const includesInventory = req.queryConfig.fields.some((field) => field.includes('variants.inventory_quantity'));
  if (includesInventory) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes('variants.inventory_quantity'),
    );
  }
  if (!req.queryConfig.fields.includes('variants.price_set.prices')) {
    req.queryConfig.fields.push('variants.price_set.prices');
  }

  const filters = {
    id: (req.params as { id?: string }).id,
    ...req.filterableFields,
  };

  if (isPresent(req.pricingContext)) {
    const context = ((filters as Record<string, unknown>).context ??= {}) as Record<string, unknown>;
    const variantsContext = (context.variants ??= {}) as Record<string, unknown>;
    variantsContext.calculated_price = QueryContext(req.pricingContext);
  }

  const includesCategoriesField = req.queryConfig.fields.some((field) => field.startsWith('categories'));
  if (!req.queryConfig.fields.includes('categories.is_internal')) {
    req.queryConfig.fields.push('categories.is_internal');
  }

  const product = await refetchProduct(filters, req.scope, req.queryConfig.fields);
  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Product with id: ${filters.id} was not found`);
  }

  if (includesInventory && product.variants?.length) {
    await attachBatchInventoryQuantities(req.scope, product.variants);
  }
  if (product.variants?.length) {
    attachVariantPrices(product.variants);
  }

  if (includesCategoriesField) {
    filterOutInternalProductCategories([product]);
  }

  await wrapProductsWithTaxPrices(req, [product]);

  res.json({ product });
};
