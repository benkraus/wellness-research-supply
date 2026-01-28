import { MedusaService } from '@medusajs/framework/utils';
import { VariantBatch } from './models/variant-batch';
import { VariantBatchAllocation } from './models/variant-batch-allocation';

class VariantBatchModuleService extends MedusaService({
  VariantBatch,
  VariantBatchAllocation,
}) {}

export default VariantBatchModuleService;
