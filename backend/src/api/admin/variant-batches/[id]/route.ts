import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { VARIANT_BATCH_MODULE } from '../../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../../modules/variant-batch/service';

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
    metadata?: Record<string, unknown> | null;
  };

  const updates: Record<string, unknown> = {};

  if (typeof body.variant_id === 'string') updates.variant_id = body.variant_id;
  if (typeof body.lot_number === 'string') updates.lot_number = body.lot_number;
  if (typeof body.coa_file_key !== 'undefined') updates.coa_file_key = body.coa_file_key;
  if (typeof body.metadata !== 'undefined') updates.metadata = body.metadata;
  if (typeof body.quantity !== 'undefined') {
    const quantity = Number(body.quantity);
    if (Number.isFinite(quantity)) {
      updates.quantity = quantity;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid updates provided.' });
  }

  const updated = await service.updateVariantBatches({ selector: { id }, data: updates });
  const batch = Array.isArray(updated) ? updated[0] : updated;

  return res.status(200).json({ batch });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const { id } = req.params;

  await service.deleteVariantBatches(id);

  return res.status(204).end();
};
