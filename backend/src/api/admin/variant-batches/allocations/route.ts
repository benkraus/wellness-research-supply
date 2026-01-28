import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { Modules } from '@medusajs/utils';
import type { IOrderModuleService, OrderDTO } from '@medusajs/types';
import { VARIANT_BATCH_MODULE } from '../../../../modules/variant-batch';
import type VariantBatchModuleService from '../../../../modules/variant-batch/service';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const { limit, offset, variant_batch_id, order_line_item_id } = req.query as Record<string, string | undefined>;

  const parsedLimit = Math.min(Number(limit) || 100, 200);
  const parsedOffset = Number(offset) || 0;

  const filters: Record<string, string> = {};
  if (variant_batch_id) filters.variant_batch_id = variant_batch_id;
  if (order_line_item_id) filters.order_line_item_id = order_line_item_id;

  const [allocations, count] = await service.listAndCountVariantBatchAllocations(filters, {
    skip: parsedOffset,
    take: parsedLimit,
  });

  const orderLineItemIds = allocations
    .map((allocation) => allocation.order_line_item_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const orderModuleService = req.scope.resolve<IOrderModuleService>(Modules.ORDER);
  const lineItems = orderLineItemIds.length
    ? await orderModuleService.listOrderLineItems(
        { id: orderLineItemIds },
        { relations: ['order'] },
      )
    : [];

  const lineItemMap = new Map(lineItems.map((item) => [item.id, item]));

  const allocationsWithDetails = allocations.map((allocation) => {
    const lineItem = lineItemMap.get(allocation.order_line_item_id);
    const order = (lineItem?.order as OrderDTO | undefined) ?? undefined;

    return {
      ...allocation,
      line_item: lineItem
        ? {
            id: lineItem.id,
            title: lineItem.title,
            product_title: lineItem.product_title,
            variant_title: lineItem.variant_title,
            variant_sku: lineItem.variant_sku,
            quantity: lineItem.quantity,
          }
        : null,
      order: order
        ? {
            id: order.id,
            display_id: order.display_id,
            status: order.status,
            email: order.email,
          }
        : null,
    };
  });

  return res.status(200).json({ allocations: allocationsWithDetails, count });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);
  const body = (req.body ?? {}) as {
    variant_batch_id?: string;
    order_line_item_id?: string;
    quantity?: number | string;
    metadata?: Record<string, unknown> | null;
  };

  if (!body.variant_batch_id || !body.order_line_item_id) {
    return res.status(400).json({ error: 'variant_batch_id and order_line_item_id are required.' });
  }

  const quantity = Number(body.quantity ?? 1);

  const allocation = await service.createVariantBatchAllocations({
    variant_batch_id: body.variant_batch_id,
    order_line_item_id: body.order_line_item_id,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    metadata: body.metadata ?? null,
  });

  return res.status(201).json({ allocation });
};
