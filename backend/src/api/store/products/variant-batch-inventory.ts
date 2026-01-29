import { VARIANT_BATCH_MODULE } from '../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../modules/variant-batch/service';

type VariantWithInventory = {
  id?: string | null;
  manage_inventory?: boolean | null;
};

type VariantBatchSummary = {
  id: string;
  lot_number?: string | null;
  available_quantity: number;
  has_coa: boolean;
  created_at?: string | Date | null;
};

type VariantWithBatchInventory = VariantWithInventory & {
  batch_inventory?: VariantBatchSummary[];
};

export const attachBatchInventoryQuantities = async (
  scope: { resolve: <T = unknown>(key: string) => T },
  variants: VariantWithInventory[],
  options: { includeInventory?: boolean; includeAtPrice?: boolean } = {},
) => {
  const includeInventory = options.includeInventory ?? true;
  const includeAtPrice = options.includeAtPrice ?? true;
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
  const costTotals = new Map<string, { cost: number; quantity: number }>();
  const batchInventoryByVariant = new Map<string, VariantBatchSummary[]>();

  batches.forEach((batch) => {
    const variantId = batch.variant_id;
    if (!variantId) {
      return;
    }
    const quantity = Number(batch.quantity ?? 0);
    const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
    const allocated = allocatedByBatch.get(batch.id) ?? 0;
    const available = Math.max(safeQuantity - allocated, 0);

    const summary: VariantBatchSummary = {
      id: batch.id,
      lot_number: batch.lot_number ?? null,
      available_quantity: available,
      has_coa: Boolean((batch as { coa_file_key?: string | null }).coa_file_key),
      created_at: (batch as { created_at?: string | Date | null }).created_at ?? null,
    };

    const list = batchInventoryByVariant.get(variantId) ?? [];
    list.push(summary);
    batchInventoryByVariant.set(variantId, list);

    if (includeInventory) {
      totals.set(variantId, (totals.get(variantId) ?? 0) + available);
    }

    if (includeAtPrice && safeQuantity > 0) {
      const supplierCost = Number((batch as { supplier_cost_per_vial?: number | null }).supplier_cost_per_vial ?? 0);
      const testingCost = Number((batch as { testing_cost?: number | null }).testing_cost ?? 0);
      const perVialTesting = safeQuantity > 0 ? testingCost / safeQuantity : 0;
      const perVialCost = supplierCost + perVialTesting;

      if (Number.isFinite(perVialCost) && perVialCost > 0) {
        const current = costTotals.get(variantId) ?? { cost: 0, quantity: 0 };
        costTotals.set(variantId, {
          cost: current.cost + perVialCost * safeQuantity,
          quantity: current.quantity + safeQuantity,
        });
      }
    }
  });

  variants.forEach((variant) => {
    if (!variant.id) {
      return;
    }

    const batchInventory = batchInventoryByVariant.get(variant.id) ?? [];
    (variant as VariantWithBatchInventory).batch_inventory = batchInventory;

    if (includeInventory && variant.manage_inventory !== false) {
      (variant as { inventory_quantity?: number }).inventory_quantity = totals.get(variant.id) ?? 0;
    }

    const baseMetadata = (variant as { metadata?: Record<string, unknown> }).metadata ?? {};
    let nextMetadata = baseMetadata;

    if (includeAtPrice) {
      const costEntry = costTotals.get(variant.id);
      if (costEntry && costEntry.quantity > 0) {
        const perVialCost = costEntry.cost / costEntry.quantity;
        nextMetadata = {
          ...nextMetadata,
          at_price_per_vial: perVialCost,
        };
      }
    }

    if (batchInventory.length) {
      nextMetadata = {
        ...nextMetadata,
        batch_inventory: batchInventory,
      };
    }

    if (nextMetadata !== baseMetadata) {
      (variant as { metadata?: Record<string, unknown> }).metadata = nextMetadata;
    }
  });
};
