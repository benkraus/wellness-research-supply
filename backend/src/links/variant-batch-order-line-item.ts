import { defineLink } from '@medusajs/framework/utils';
import OrderModule from '@medusajs/medusa/order';
import VariantBatchModule from '../modules/variant-batch';

export default defineLink(
  {
    linkable: VariantBatchModule.linkable.variantBatchAllocation,
    field: 'order_line_item_id',
  },
  OrderModule.linkable.orderLineItem,
  { readOnly: true },
);
