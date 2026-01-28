import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MINIO_BUCKET, MINIO_ENDPOINT } from 'lib/constants';
import { VARIANT_BATCH_MODULE } from '../../../../modules/variant-batch';

const DEFAULT_BUCKET = 'medusa-media';

const buildMinioPublicUrl = (fileKey: string) => {
  if (!MINIO_ENDPOINT) return null;

  let endpoint = MINIO_ENDPOINT.trim();
  let protocol = 'https';

  if (endpoint.startsWith('http://')) {
    protocol = 'http';
    endpoint = endpoint.replace('http://', '');
  } else if (endpoint.startsWith('https://')) {
    protocol = 'https';
    endpoint = endpoint.replace('https://', '');
  }

  endpoint = endpoint.replace(/\/$/, '');

  const bucket = MINIO_BUCKET || DEFAULT_BUCKET;
  return `${protocol}://${endpoint}/${bucket}/${fileKey}`;
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const rawLot = (req.params?.lot ?? '').toString();
  const lot = rawLot.replace(/\.pdf$/i, '').trim();

  if (!lot) {
    return res.status(400).json({ error: 'Lot number is required.' });
  }

  const variantBatchModuleService = req.scope.resolve(VARIANT_BATCH_MODULE);
  const [batch] = await variantBatchModuleService.listVariantBatches({ lot_number: lot });

  if (!batch?.coa_file_key) {
    return res.status(404).json({ error: 'COA not found for this lot.' });
  }

  const coaUrl = buildMinioPublicUrl(batch.coa_file_key);

  if (!coaUrl) {
    return res.status(500).json({ error: 'COA storage is not configured.' });
  }

  return res.redirect(coaUrl);
};
