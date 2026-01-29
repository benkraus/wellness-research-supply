import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { VARIANT_BATCH_MODULE } from '../../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../../modules/variant-batch/service';
import { syncAtPricePriceListForVariants } from '../../../../lib/at-price-pricing';
import { syncInventoryLevelsForVariants } from '../../../../lib/variant-batch-inventory';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const { id } = req.params;

  const batch = await service.retrieveVariantBatch(id);

  return res.status(200).json({ batch });
};

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const { id } = req.params;
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

  const updates: Record<string, unknown> = {};

  if (typeof body.variant_id === 'string') updates.variant_id = body.variant_id;
  if (typeof body.lot_number === 'string') updates.lot_number = body.lot_number;
  if (typeof body.coa_file_key !== 'undefined') updates.coa_file_key = body.coa_file_key;
  if (typeof body.invoice_url !== 'undefined') updates.invoice_url = body.invoice_url;
  if (typeof body.lab_invoice_url !== 'undefined') updates.lab_invoice_url = body.lab_invoice_url;
  if (typeof body.supplier_cost_per_vial !== 'undefined') {
    if (body.supplier_cost_per_vial === null) {
      updates.supplier_cost_per_vial = null;
    } else {
      const supplierCost = Number(body.supplier_cost_per_vial);
      updates.supplier_cost_per_vial = Number.isFinite(supplierCost) ? supplierCost : null;
    }
  }
  if (typeof body.testing_cost !== 'undefined') {
    if (body.testing_cost === null) {
      updates.testing_cost = null;
    } else {
      const testingCost = Number(body.testing_cost);
      updates.testing_cost = Number.isFinite(testingCost) ? testingCost : null;
    }
  }
  if (typeof body.metadata !== 'undefined') updates.metadata = body.metadata;
  if (typeof body.received_at !== 'undefined') {
    const parsedReceivedAt = body.received_at ? new Date(body.received_at) : null;
    updates.received_at =
      parsedReceivedAt && !Number.isNaN(parsedReceivedAt.getTime()) ? parsedReceivedAt : null;
  }
  if (typeof body.quantity !== 'undefined') {
    const quantity = Number(body.quantity);
    if (Number.isFinite(quantity)) {
      updates.quantity = quantity;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid updates provided.' });
  }

  const existing = await service.retrieveVariantBatch(id);
  const updated = await service.updateVariantBatches({ selector: { id }, data: updates });
  const batch = Array.isArray(updated) ? updated[0] : updated;

  const variantIds = [existing.variant_id, batch.variant_id].filter(
    (variantId): variantId is string => typeof variantId === 'string' && variantId.length > 0,
  );
  try {
    await syncInventoryLevelsForVariants(variantIds, req.scope);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to sync inventory levels after batch update', error);
  }

  try {
    await syncAtPricePriceListForVariants(variantIds, req.scope);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to sync at-price list after batch update', error);
  }

  return res.status(200).json({ batch });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const { id } = req.params;

  const existing = await service.retrieveVariantBatch(id);
  await service.deleteVariantBatches(id);

  try {
    await syncInventoryLevelsForVariants([existing.variant_id], req.scope);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to sync inventory levels after batch delete', error);
  }

  try {
    await syncAtPricePriceListForVariants([existing.variant_id], req.scope);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to sync at-price list after batch delete', error);
  }

  return res.status(204).end();
};
