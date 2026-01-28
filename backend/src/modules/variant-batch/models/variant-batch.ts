import { model } from '@medusajs/framework/utils';

export const VariantBatch = model.define('variant_batch', {
  id: model.id({ prefix: 'vb_' }).primaryKey(),
  variant_id: model.text(),
  lot_number: model.text(),
  coa_file_key: model.text().nullable(),
  quantity: model.number().default(0),
  metadata: model.json().nullable(),
});
