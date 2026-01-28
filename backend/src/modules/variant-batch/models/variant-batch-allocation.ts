import { model } from '@medusajs/framework/utils';

export const VariantBatchAllocation = model.define('variant_batch_allocation', {
  id: model.id({ prefix: 'vba_' }).primaryKey(),
  variant_batch_id: model.text(),
  order_line_item_id: model.text(),
  quantity: model.number().default(1),
  metadata: model.json().nullable(),
});
