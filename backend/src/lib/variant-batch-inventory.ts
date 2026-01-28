import { Modules } from '@medusajs/framework/utils';
import type { IInventoryService, IStockLocationService, IStoreModuleService } from '@medusajs/types';

import { VARIANT_BATCH_MODULE } from '../modules/variant-batch';
import type VariantBatchModuleService from '../modules/variant-batch/service';

type QueryGraph = {
  graph: (args: {
    entity: string;
    fields: string[];
    filters?: Record<string, unknown>;
  }) => Promise<{ data: Array<Record<string, unknown>> }>;
};

type VariantInventoryItemLink = {
  inventory_item_id?: string | null;
  required_quantity?: number | null;
};

type VariantInventoryGraph = {
  id: string;
  manage_inventory?: boolean | null;
  inventory_items?: VariantInventoryItemLink[] | null;
};

const normalizeIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

export const syncInventoryLevelsForVariants = async (
  variantIds: string[],
  scope: { resolve: <T = unknown>(key: string) => T },
) => {
  const uniqueVariantIds = normalizeIds(variantIds);

  if (!uniqueVariantIds.length) {
    return;
  }

  const query = scope.resolve<QueryGraph>('query');
  const { data: initialVariants } = await query.graph({
    entity: 'variant',
    fields: [
      'id',
      'manage_inventory',
      'inventory_items.inventory_item_id',
      'inventory_items.required_quantity',
    ],
    filters: {
      id: uniqueVariantIds,
    },
  });

  const initialVariantList = (initialVariants ?? []) as VariantInventoryGraph[];
  const inventoryItemIds = normalizeIds(
    initialVariantList
      .flatMap((variant) => variant.inventory_items ?? [])
      .map((item) => item.inventory_item_id ?? '')
      .filter(Boolean),
  );

  let linkedVariantIds: string[] = [];

  if (inventoryItemIds.length) {
    const { data: linkedVariants } = await query.graph({
      entity: 'variant',
      fields: ['id'],
      filters: {
        inventory_items: {
          inventory_item_id: inventoryItemIds,
        },
      },
    });

    linkedVariantIds = normalizeIds(
      (linkedVariants ?? [])
        .map((variant) => (variant as { id?: string }).id ?? '')
        .filter(Boolean),
    );
  }

  const allVariantIds = normalizeIds([
    ...initialVariantList.map((variant) => variant.id),
    ...linkedVariantIds,
  ]);
  if (!allVariantIds.length) {
    return;
  }

  const { data: fullVariants } = await query.graph({
    entity: 'variant',
    fields: [
      'id',
      'manage_inventory',
      'inventory_items.inventory_item_id',
      'inventory_items.required_quantity',
    ],
    filters: {
      id: allVariantIds,
    },
  });

  const variants = (fullVariants ?? []) as VariantInventoryGraph[];

  const batchService = scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const batches = await batchService.listVariantBatches({ variant_id: allVariantIds });

  const variantTotals = new Map<string, number>();
  allVariantIds.forEach((id) => variantTotals.set(id, 0));

  batches.forEach((batch) => {
    const next = (variantTotals.get(batch.variant_id) ?? 0) + Number(batch.quantity ?? 0);
    variantTotals.set(batch.variant_id, next);
  });

  const inventoryItemTotals = new Map<string, number>();
  const managedInventoryItems = new Set<string>();

  for (const variant of variants) {
    if (variant.manage_inventory === false) {
      continue;
    }

    const total = Math.max(Number(variantTotals.get(variant.id) ?? 0), 0);
    const inventoryItems = Array.isArray(variant.inventory_items) ? variant.inventory_items : [];

    if (!inventoryItems.length) {
      continue;
    }

    for (const item of inventoryItems) {
      const inventoryItemId = item.inventory_item_id ?? null;
      if (!inventoryItemId) {
        continue;
      }

      managedInventoryItems.add(inventoryItemId);
      const required = Number(item.required_quantity ?? 1);
      const multiplier = Number.isFinite(required) && required > 0 ? required : 1;
      const itemTotal = total * multiplier;
      inventoryItemTotals.set(
        inventoryItemId,
        (inventoryItemTotals.get(inventoryItemId) ?? 0) + itemTotal,
      );
    }
  }

  if (!managedInventoryItems.size) {
    return;
  }

  const inventoryService = scope.resolve<IInventoryService>(Modules.INVENTORY);
  const storeService = scope.resolve<IStoreModuleService>(Modules.STORE);
  const stockLocationService = scope.resolve<IStockLocationService>(Modules.STOCK_LOCATION);

  let defaultLocationId: string | null = null;
  try {
    const stores = await storeService.listStores();
    defaultLocationId = stores?.[0]?.default_location_id ?? null;
  } catch {
    defaultLocationId = null;
  }

  if (!defaultLocationId) {
    const locations = await stockLocationService.listStockLocations({}, { take: 1 });
    defaultLocationId = locations?.[0]?.id ?? null;
  }

  for (const inventoryItemId of managedInventoryItems) {
    const target = inventoryItemTotals.get(inventoryItemId) ?? 0;
    const sanitizedTarget = Math.max(0, Math.round(Number(target)));
    const levels = await inventoryService.listInventoryLevels({ inventory_item_id: inventoryItemId });

    if (!levels.length) {
      if (!defaultLocationId) {
        continue;
      }

      await inventoryService.createInventoryLevels({
        inventory_item_id: inventoryItemId,
        location_id: defaultLocationId,
        stocked_quantity: sanitizedTarget,
      });
      continue;
    }

    const existingTotal = levels.reduce(
      (sum, level) => sum + Number(level.stocked_quantity ?? 0),
      0,
    );

    const updates = levels.map((level, index) => {
      let nextQuantity = 0;

      if (levels.length === 1) {
        nextQuantity = sanitizedTarget;
      } else if (existingTotal > 0) {
        if (index === levels.length - 1) {
          const assigned = levels.slice(0, -1).reduce((sum, entry) => {
            const ratio = Number(entry.stocked_quantity ?? 0) / existingTotal;
            return sum + Math.round(sanitizedTarget * ratio);
          }, 0);
          nextQuantity = Math.max(sanitizedTarget - assigned, 0);
        } else {
          const ratio = Number(level.stocked_quantity ?? 0) / existingTotal;
          nextQuantity = Math.round(sanitizedTarget * ratio);
        }
      } else {
        nextQuantity = index === 0 ? sanitizedTarget : 0;
      }

      return {
        inventory_item_id: inventoryItemId,
        location_id: level.location_id,
        stocked_quantity: nextQuantity,
      };
    });

    await inventoryService.updateInventoryLevels(updates);
  }
};
