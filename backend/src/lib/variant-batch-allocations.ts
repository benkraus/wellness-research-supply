import { Modules } from '@medusajs/framework/utils';
import type { IOrderModuleService, OrderLineItemDTO } from '@medusajs/framework/types';

import { VARIANT_BATCH_MODULE } from '../modules/variant-batch';
import type VariantBatchModuleService from '../modules/variant-batch/service';

const sortByCreatedAt = (
  a: { created_at?: string | Date },
  b: { created_at?: string | Date }
) => {
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return aTime - bTime;
};

export const allocateVariantBatchesForOrder = async (orderId: string, container: any) => {
  const orderService: IOrderModuleService = container.resolve(Modules.ORDER);
  const batchService = container.resolve(VARIANT_BATCH_MODULE) as VariantBatchModuleService;

  const order = await orderService.retrieveOrder(orderId, {
    relations: ['items'],
  });

  const items = Array.isArray(order.items) ? order.items : [];

  for (const item of items) {
    const variantId = (item as OrderLineItemDTO).variant_id as string | undefined;
    const quantity = Number((item as OrderLineItemDTO).quantity ?? 0);

    if (!variantId || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const existing = await batchService.listVariantBatchAllocations({
      order_line_item_id: item.id,
    });

    const alreadyAllocated = existing.reduce(
      (sum, allocation) => sum + Number(allocation.quantity ?? 0),
      0
    );

    const batches = await batchService.listVariantBatches({ variant_id: variantId });
    const batchIds = batches.map((batch) => batch.id);
    const allocations = batchIds.length
      ? await batchService.listVariantBatchAllocations({ variant_batch_id: batchIds })
      : [];

    const allocatedByBatch = new Map<string, number>();
    allocations.forEach((allocation) => {
      const current = allocatedByBatch.get(allocation.variant_batch_id) ?? 0;
      allocatedByBatch.set(
        allocation.variant_batch_id,
        current + Number(allocation.quantity ?? 0)
      );
    });

    const availableBatches = batches
      .filter((batch) => Number(batch.quantity ?? 0) > 0)
      .sort(sortByCreatedAt);

    let remaining = Math.max(quantity - alreadyAllocated, 0);

    if (remaining === 0) {
      continue;
    }

    for (const batch of availableBatches) {
      if (remaining <= 0) {
        break;
      }

      const allocated = allocatedByBatch.get(batch.id) ?? 0;
      const available = Number(batch.quantity ?? 0) - allocated;
      if (!Number.isFinite(available) || available <= 0) {
        continue;
      }

      const allocationQuantity = Math.min(available, remaining);

      await batchService.createVariantBatchAllocations({
        variant_batch_id: batch.id,
        order_line_item_id: item.id,
        quantity: allocationQuantity,
        metadata: {
          order_id: order.id,
          auto: true,
        },
      });

      remaining -= allocationQuantity;
    }

    if (remaining > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `Variant batch allocation shortfall for order ${order.id} line item ${item.id}: missing ${remaining}`
      );
    }
  }
};

export const releaseVariantBatchAllocationsForOrder = async (orderId: string, container: any) => {
  const orderService: IOrderModuleService = container.resolve(Modules.ORDER);
  const batchService = container.resolve(VARIANT_BATCH_MODULE) as VariantBatchModuleService;

  let lineItems: Array<OrderLineItemDTO> = [];
  const deleteAllocationsByOrderId = async () => {
    try {
      const allocations = await batchService.listVariantBatchAllocations({
        metadata: { order_id: orderId } as Record<string, unknown>,
      });

      if (allocations.length) {
        await batchService.deleteVariantBatchAllocations(
          allocations.map((allocation) => allocation.id)
        );
      }
    } catch {
      // ignore - best-effort fallback
    }
  };

  try {
    const order = await orderService.retrieveOrder(orderId, {
      relations: ['items'],
    });
    lineItems = Array.isArray(order.items) ? (order.items as OrderLineItemDTO[]) : [];
  } catch (error) {
    await deleteAllocationsByOrderId();
    return;
  }

  if (!lineItems.length) {
    await deleteAllocationsByOrderId();
    return;
  }

  for (const item of lineItems) {
    const allocations = await batchService.listVariantBatchAllocations({
      order_line_item_id: item.id,
    });

    if (!allocations.length) {
      continue;
    }

    await batchService.deleteVariantBatchAllocations(allocations.map((allocation) => allocation.id));
  }
};
