import type { MedusaResponse, MedusaStoreRequest } from '@medusajs/framework/http';

import { VARIANT_BATCH_MODULE } from '../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../modules/variant-batch/service';

type BatchSummary = {
  id: string;
  lot_number?: string | null;
  available_quantity: number;
  has_coa: boolean;
  created_at?: string | Date | null;
};

type VariantBatchEntry = {
  variant_id: string;
  batches: BatchSummary[];
};

export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const variantIdsParam =
    (req.query.variant_ids as string | undefined) ?? (req.query.variant_id as string | undefined) ?? '';
  const variantIds = variantIdsParam
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!variantIds.length) {
    return res.status(400).json({ error: 'variant_ids is required.' });
  }

  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
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
    if (!batchId) return;
    const quantity = Number(allocation.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    allocatedByBatch.set(batchId, (allocatedByBatch.get(batchId) ?? 0) + quantity);
  });

  const batchesByVariant = new Map<string, BatchSummary[]>();
  batches.forEach((batch) => {
    const variantId = batch.variant_id;
    if (!variantId) return;

    const quantity = Number(batch.quantity ?? 0);
    const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
    const allocated = allocatedByBatch.get(batch.id) ?? 0;
    const available = Math.max(safeQuantity - allocated, 0);

    const summary: BatchSummary = {
      id: batch.id,
      lot_number: batch.lot_number ?? null,
      available_quantity: available,
      has_coa: Boolean((batch as { coa_file_key?: string | null }).coa_file_key),
      created_at: (batch as { created_at?: string | Date | null }).created_at ?? null,
    };

    const list = batchesByVariant.get(variantId) ?? [];
    list.push(summary);
    batchesByVariant.set(variantId, list);
  });

  const variant_batches: VariantBatchEntry[] = variantIds.map((variantId) => ({
    variant_id: variantId,
    batches: batchesByVariant.get(variantId) ?? [],
  }));

  return res.status(200).json({ variant_batches });
};
