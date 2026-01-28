import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { VARIANT_BATCH_MODULE } from '../../../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../../../modules/variant-batch/service';

type QueryGraph = {
  graph: (args: {
    entity: string;
    fields: string[];
    filters?: Record<string, unknown>;
  }) => Promise<{ data: Array<Record<string, unknown>> }>;
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params as { id: string };

  if (!id) {
    return res.status(400).json({ error: 'Inventory item id is required.' });
  }

  const query = req.scope.resolve<QueryGraph>('query');
  const { data } = await query.graph({
    entity: 'inventory_item',
    fields: [
      'id',
      'sku',
      'title',
      'variants.id',
      'variants.title',
      'variants.sku',
      'variants.product.id',
      'variants.product.title',
    ],
    filters: { id },
  });

  const inventoryItem = data?.[0] as
    | {
        id: string;
        sku?: string | null;
        title?: string | null;
        variants?: Array<{
          id: string;
          title?: string | null;
          sku?: string | null;
          product?: { id: string; title?: string | null } | null;
        }>;
      }
    | undefined;

  const variants = inventoryItem?.variants ?? [];
  const variantIds = variants.map((variant) => variant.id).filter(Boolean);

  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const filters: Record<string, unknown> = {};
  if (variantIds.length) {
    filters.variant_id = variantIds;
  }
  const batches = variantIds.length ? await service.listVariantBatches(filters) : [];

  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const enriched = batches.map((batch) => ({
    ...batch,
    variant: variantById.get(batch.variant_id) ?? null,
  }));

  const inStock = enriched.filter((batch) => Number(batch.quantity ?? 0) > 0);
  const totalQuantity = inStock.reduce((sum, batch) => sum + Number(batch.quantity ?? 0), 0);

  return res.status(200).json({
    inventory_item_id: id,
    variants,
    batches: inStock,
    count: inStock.length,
    total_quantity: totalQuantity,
  });
};
