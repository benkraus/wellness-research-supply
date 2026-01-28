import { model } from '@medusajs/framework/utils';

export const VariantBatch = model.define('variant_batch', {
  id: model.id({ prefix: 'vb_' }).primaryKey(),
  variant_id: model.text(),
  lot_number: model.text(),
  received_at: model.dateTime().nullable(),
  invoice_url: model.text().nullable(),
  lab_invoice_url: model.text().nullable(),
  coa_file_key: model.text().nullable(),
  quantity: model.number().default(0),
  metadata: model.json().nullable(),
});
