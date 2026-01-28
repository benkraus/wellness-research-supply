import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { VARIANT_BATCH_MODULE } from '../../../../../modules/variant-batch';

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(VARIANT_BATCH_MODULE);
  const { id } = req.params;

  await service.deleteVariantBatchAllocations(id);

  return res.status(204).end();
};
