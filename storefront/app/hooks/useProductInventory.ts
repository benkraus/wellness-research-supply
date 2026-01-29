import type { StoreProduct, StoreProductVariant } from '@medusajs/types';
import { useMemo } from 'react';

type BatchInventorySummary = {
  id: string;
  lot_number?: string | null;
  available_quantity: number;
  has_coa: boolean;
  created_at?: string | Date | null;
};

type VariantWithBatchInventory = StoreProductVariant & {
  batch_inventory?: BatchInventorySummary[];
};

type VariantWithBatchInventoryMetadata = StoreProductVariant & {
  metadata?: {
    batch_inventory?: BatchInventorySummary[];
  } | null;
};

const getLatestBatch = (batches: BatchInventorySummary[]) => {
  if (!batches.length) return null;
  return [...batches].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  })[0];
};

const selectPendingBatch = (batches: BatchInventorySummary[]) => {
  if (!batches.length) return null;
  return [...batches]
    .filter((batch) => batch.available_quantity > 0 && !batch.has_coa)
    .sort((a, b) => {
      if (b.available_quantity !== a.available_quantity) {
        return b.available_quantity - a.available_quantity;
      }
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })[0];
};

const summarizeBatches = (batches: BatchInventorySummary[]) => {
  const hasPurchasableBatch = batches.some((batch) => batch.available_quantity > 0 && batch.has_coa);
  const hasPendingBatch = batches.some((batch) => batch.available_quantity > 0 && !batch.has_coa);
  const pendingBatch = selectPendingBatch(batches);
  const fallbackBatch = getLatestBatch(batches);

  return {
    hasPurchasableBatch,
    hasPendingBatch,
    pendingBatchId: pendingBatch?.id ?? null,
    notifyBatchId: (pendingBatch ?? fallbackBatch)?.id ?? null,
  };
};

const getVariantBatches = (variant?: StoreProductVariant) => {
  if (!variant) return [];
  return (
    (variant as VariantWithBatchInventory).batch_inventory ??
    (variant as VariantWithBatchInventoryMetadata).metadata?.batch_inventory ??
    []
  );
};

export const useProductInventory = (product: StoreProduct) => {
  return useMemo(() => {
    const totalInventory =
      product.variants?.reduce((total, variant) => {
        if (variant.allow_backorder || !variant.manage_inventory) return Infinity;
        return total + (variant.inventory_quantity || 0);
      }, 0) ?? 0;
    const averageInventory = totalInventory / (product?.variants?.length ?? 1);

    const variantBatches = product.variants?.flatMap((variant) => getVariantBatches(variant)) ?? [];
    const productSummary = summarizeBatches(variantBatches);

    const isPurchasable = productSummary.hasPurchasableBatch || totalInventory === Infinity;
    const isComingSoon = !isPurchasable && productSummary.hasPendingBatch;
    const isSoldOut = !isPurchasable && !productSummary.hasPendingBatch;

    const getVariantAvailability = (variant?: StoreProductVariant) => {
      if (!variant) {
        return {
          isPurchasable,
          isComingSoon,
          isSoldOut,
          pendingBatchId: productSummary.pendingBatchId,
          notifyBatchId: productSummary.notifyBatchId,
        };
      }

      if (variant.allow_backorder || !variant.manage_inventory) {
        return {
          isPurchasable: true,
          isComingSoon: false,
          isSoldOut: false,
          pendingBatchId: null,
          notifyBatchId: getLatestBatch(getVariantBatches(variant))?.id ?? null,
        };
      }

      const summary = summarizeBatches(getVariantBatches(variant));
      const isVariantPurchasable = summary.hasPurchasableBatch;
      const isVariantComingSoon = !isVariantPurchasable && summary.hasPendingBatch;
      const isVariantSoldOut = !isVariantPurchasable && !summary.hasPendingBatch;

      return {
        isPurchasable: isVariantPurchasable,
        isComingSoon: isVariantComingSoon,
        isSoldOut: isVariantSoldOut,
        pendingBatchId: summary.pendingBatchId,
        notifyBatchId: summary.notifyBatchId,
      };
    };

    return {
      averageInventory,
      totalInventory,
      isPurchasable,
      isComingSoon,
      isSoldOut,
      pendingBatchId: productSummary.pendingBatchId,
      notifyBatchId: productSummary.notifyBatchId,
      getVariantAvailability,
    };
  }, [product]);
};
