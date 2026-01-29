import type { StoreProduct } from '@medusajs/types';

import { getMedusaBaseUrl, getPublishableKey } from './client.server';

type VariantBatchEntry = {
  variant_id: string;
  batches: unknown[];
};

type VariantBatchResponse = {
  variant_batches?: VariantBatchEntry[];
};

export const attachVariantBatchInventory = async (products: StoreProduct[]) => {
  const variantIds = products
    .flatMap((product) => product.variants ?? [])
    .map((variant) => variant?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (!variantIds.length) {
    return;
  }

  const publishableKey = await getPublishableKey();
  const baseUrl = getMedusaBaseUrl();
  const url = new URL('/store/variant-batches', baseUrl);
  url.searchParams.set('variant_ids', variantIds.join(','));

  const response = await fetch(url.toString(), {
    headers: {
      ...(publishableKey ? { 'x-publishable-api-key': publishableKey } : {}),
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as VariantBatchResponse;
  const entries = payload.variant_batches ?? [];
  const batchesByVariant = new Map(entries.map((entry) => [entry.variant_id, entry.batches]));

  products.forEach((product) => {
    product.variants?.forEach((variant) => {
      const variantId = variant?.id;
      if (!variantId) return;
      const batches = batchesByVariant.get(variantId) ?? [];
      if (!batches.length) return;
      (variant as { batch_inventory?: unknown[] }).batch_inventory = batches;
    });
  });
};
