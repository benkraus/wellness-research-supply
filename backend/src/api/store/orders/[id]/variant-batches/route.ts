import type { MedusaResponse, MedusaStoreRequest } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';
import type { IOrderModuleService, OrderLineItemDTO } from '@medusajs/framework/types';

import { BACKEND_URL } from '../../../../../lib/constants';
import { VARIANT_BATCH_MODULE } from '../../../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../../../modules/variant-batch/service';

export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const authContext = req.auth_context;

  if (!authContext || authContext.actor_type !== 'customer') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { id } = req.params as { id: string };

  if (!id) {
    return res.status(400).json({ error: 'Order id is required.' });
  }

  const orderService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
  let order: Awaited<ReturnType<IOrderModuleService['retrieveOrder']>>;

  try {
    order = await orderService.retrieveOrder(id, { relations: ['items'] });
  } catch {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const orderCustomerId =
    (order as { customer_id?: string | null }).customer_id ??
    (order as { customer?: { id?: string | null } | null }).customer?.id ??
    null;

  if (!orderCustomerId || orderCustomerId !== authContext.actor_id) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  const items = Array.isArray(order.items) ? (order.items as OrderLineItemDTO[]) : [];

  if (items.length === 0) {
    return res.status(200).json({ order_id: id, items: [] });
  }

  const batchService = req.scope.resolve(VARIANT_BATCH_MODULE) as VariantBatchModuleService;
  const lineItemIds = items.map((item) => item.id);
  const allocations = await batchService.listVariantBatchAllocations({
    order_line_item_id: lineItemIds,
  });

  const batchIds = allocations.map((allocation) => allocation.variant_batch_id);
  const batches = batchIds.length
    ? await batchService.listVariantBatches({ id: batchIds })
    : [];
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));

  const allocationsByLineItem = new Map<string, typeof allocations>();
  allocations.forEach((allocation) => {
    const list = allocationsByLineItem.get(allocation.order_line_item_id) ?? [];
    list.push(allocation);
    allocationsByLineItem.set(allocation.order_line_item_id, list);
  });

  const responseItems = items.map((item) => {
    const itemAllocations = allocationsByLineItem.get(item.id) ?? [];

    const batchesForItem = itemAllocations
      .map((allocation) => {
        const batch = batchById.get(allocation.variant_batch_id);
        if (!batch) {
          return null;
        }

        const lot = batch.lot_number;
        return {
          id: batch.id,
          lot_number: lot,
          quantity: Number(allocation.quantity ?? 0),
          coa_available: Boolean(batch.coa_file_key),
          coa_url: batch.coa_file_key
            ? `${BACKEND_URL.replace(/\/$/, '')}/store/coa/${encodeURIComponent(lot)}`
            : null,
        };
      })
      .filter(Boolean);

    return {
      line_item_id: item.id,
      product_title: item.product_title,
      variant_title: item.variant_title ?? item.title,
      quantity: Number(item.quantity ?? 0),
      batches: batchesForItem,
    };
  });

  return res.status(200).json({ order_id: id, items: responseItems });
};
