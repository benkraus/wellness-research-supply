import { VARIANT_BATCH_MODULE } from '../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../modules/variant-batch/service';

type VariantWithInventory = {
  id?: string | null;
  manage_inventory?: boolean | null;
};

export const attachBatchInventoryQuantities = async (
  scope: { resolve: <T = unknown>(key: string) => T },
  variants: VariantWithInventory[],
) => {
  const variantIds = variants
    .map((variant) => variant.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (!variantIds.length) {
    return;
  }

  const service = scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const batches = await service.listVariantBatches({ variant_id: variantIds });
  const batchIds = batches
    .map((batch) => batch.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const allocations = batchIds.length
    ? await service.listVariantBatchAllocations({ variant_batch_id: batchIds })
    : [];

  const allocatedByBatch = new Map<string, number>();
  allocations.forEach((allocation) => {
    const batchId = allocation.variant_batch_id;
    if (!batchId) {
      return;
    }
    const quantity = Number(allocation.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }
    allocatedByBatch.set(batchId, (allocatedByBatch.get(batchId) ?? 0) + quantity);
  });

  const totals = new Map<string, number>();
  batches.forEach((batch) => {
    const variantId = batch.variant_id;
    if (!variantId) {
      return;
    }
    const quantity = Number(batch.quantity ?? 0);
    const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
    const allocated = allocatedByBatch.get(batch.id) ?? 0;
    const available = Math.max(safeQuantity - allocated, 0);
    totals.set(variantId, (totals.get(variantId) ?? 0) + available);
  });

  variants.forEach((variant) => {
    if (!variant.id || variant.manage_inventory === false) {
      return;
    }
    (variant as { inventory_quantity?: number }).inventory_quantity = totals.get(variant.id) ?? 0;
  });
};
