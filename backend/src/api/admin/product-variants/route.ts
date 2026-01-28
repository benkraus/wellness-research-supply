import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { refetchEntities } from '@medusajs/framework/http';
import { remapKeysForVariant, remapVariantResponse } from '../products/variant-helpers';

import { VARIANT_BATCH_MODULE } from '../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../modules/variant-batch/service';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const fields = req.queryConfig.fields ?? [];
  const withInventoryQuantity = fields.some((field) => field.includes('inventory_quantity'));

  if (withInventoryQuantity) {
    req.queryConfig.fields = fields.filter((field) => !field.includes('inventory_quantity'));
  }

  const { data: variants, metadata } = await refetchEntities({
    entity: 'variant',
    idOrFilter: { ...req.filterableFields },
    scope: req.scope,
    fields: remapKeysForVariant(req.queryConfig.fields ?? []),
    pagination: req.queryConfig.pagination,
  });

  if (withInventoryQuantity) {
    const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
    const variantIds = (variants ?? []).map((variant) => variant.id).filter(Boolean);

    const totals = new Map<string, number>();
    if (variantIds.length) {
      const batches = await service.listVariantBatches({ variant_id: variantIds });
      batches.forEach((batch) => {
        const next = (totals.get(batch.variant_id) ?? 0) + Number(batch.quantity ?? 0);
        totals.set(batch.variant_id, next);
      });
    }

    (variants ?? []).forEach((variant) => {
      if (variant.manage_inventory === false) {
        return;
      }
      (variant as { inventory_quantity?: number }).inventory_quantity = totals.get(variant.id) ?? 0;
    });
  }

  return res.json({
    variants: (variants ?? []).map(remapVariantResponse),
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  });
};
