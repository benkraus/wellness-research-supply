import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { VARIANT_BATCH_MODULE } from '../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../modules/variant-batch/service';
import { syncInventoryLevelsForVariants } from '../../../lib/variant-batch-inventory';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const {
    limit,
    offset,
    variant_id,
    lot_number,
    has_coa,
    min_quantity,
    max_quantity,
  } = req.query as Record<string, string | undefined>;

  const parsedLimit = Math.min(Number(limit) || 200, 500);
  const parsedOffset = Number(offset) || 0;

  const filters: Record<string, string> = {};
  if (variant_id) filters.variant_id = variant_id;
  if (lot_number) filters.lot_number = lot_number;

  const [batches] = await service.listAndCountVariantBatches(filters, {
    skip: parsedOffset,
    take: parsedLimit,
  });

  let filtered = batches;

  if (has_coa === 'true') {
    filtered = filtered.filter((batch) => !!batch.coa_file_key);
  }
  if (has_coa === 'false') {
    filtered = filtered.filter((batch) => !batch.coa_file_key);
  }

  if (min_quantity !== undefined && min_quantity !== '') {
    const min = Number(min_quantity);
    if (Number.isFinite(min)) {
      filtered = filtered.filter((batch) => Number(batch.quantity ?? 0) >= min);
    }
  }

  if (max_quantity !== undefined && max_quantity !== '') {
    const max = Number(max_quantity);
    if (Number.isFinite(max)) {
      filtered = filtered.filter((batch) => Number(batch.quantity ?? 0) <= max);
    }
  }

  return res.status(200).json({ batches: filtered, count: filtered.length });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const body = (req.body ?? {}) as {
    variant_id?: string;
    lot_number?: string;
    quantity?: number | string;
    coa_file_key?: string | null;
    metadata?: Record<string, unknown> | null;
  };

  if (!body.variant_id || !body.lot_number) {
    return res.status(400).json({ error: 'variant_id and lot_number are required.' });
  }

  const quantity = Number(body.quantity ?? 0);

  const batch = await service.createVariantBatches({
    variant_id: body.variant_id,
    lot_number: body.lot_number,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    coa_file_key: body.coa_file_key ?? null,
    metadata: body.metadata ?? null,
  });

  await syncInventoryLevelsForVariants([batch.variant_id], req.scope);

  return res.status(201).json({ batch });
};
