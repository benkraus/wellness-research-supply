import { Module } from '@medusajs/framework/utils';
import VariantBatchModuleService from './service';

export const VARIANT_BATCH_MODULE = 'variantBatchModuleService';

export default Module(VARIANT_BATCH_MODULE, {
  service: VariantBatchModuleService,
});
