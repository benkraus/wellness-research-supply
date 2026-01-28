import { defineLink } from '@medusajs/framework/utils';
import ProductModule from '@medusajs/medusa/product';
import VariantBatchModule from '../modules/variant-batch';

export default defineLink(
  {
    linkable: VariantBatchModule.linkable.variantBatch,
    field: 'variant_id',
  },
  ProductModule.linkable.productVariant,
  { readOnly: true },
);
