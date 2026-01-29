import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { VARIANT_BATCH_MODULE } from '../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../modules/variant-batch/service';
import { syncAtPricePriceListForVariants } from '../../../lib/at-price-pricing';
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
    received_at?: string | null;
    invoice_url?: string | null;
    lab_invoice_url?: string | null;
    supplier_cost_per_vial?: number | string | null;
    testing_cost?: number | string | null;
    metadata?: Record<string, unknown> | null;
  };

  if (!body.variant_id || !body.lot_number) {
    return res.status(400).json({ error: 'variant_id and lot_number are required.' });
  }

  const quantity = Number(body.quantity ?? 0);
  const supplierCost =
    body.supplier_cost_per_vial === null || body.supplier_cost_per_vial === undefined
      ? null
      : Number(body.supplier_cost_per_vial);
  const testingCost =
    body.testing_cost === null || body.testing_cost === undefined
      ? null
      : Number(body.testing_cost);

  const parsedReceivedAt = body.received_at ? new Date(body.received_at) : null;
  const receivedAt = parsedReceivedAt && !Number.isNaN(parsedReceivedAt.getTime())
    ? parsedReceivedAt
    : null;

  const batch = await service.createVariantBatches({
    variant_id: body.variant_id,
    lot_number: body.lot_number,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    coa_file_key: body.coa_file_key ?? null,
    received_at: receivedAt,
    invoice_url: body.invoice_url ?? null,
    lab_invoice_url: body.lab_invoice_url ?? null,
    supplier_cost_per_vial: Number.isFinite(supplierCost) ? supplierCost : null,
    testing_cost: Number.isFinite(testingCost) ? testingCost : null,
    metadata: body.metadata ?? null,
  });

  try {
    await syncInventoryLevelsForVariants([batch.variant_id], req.scope);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to sync inventory levels after batch create', error);
  }

  try {
    await syncAtPricePriceListForVariants([batch.variant_id], req.scope);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to sync at-price list after batch create', error);
  }

  return res.status(201).json({ batch });
};
