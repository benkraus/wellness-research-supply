import { Modules } from '@medusajs/framework/utils';
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa';

import type { IPaymentModuleService } from '@medusajs/framework/types';
import { allocateVariantBatchesForOrder } from '../lib/variant-batch-allocations';

type QueryGraph = {
  graph: (args: {
    entity: string;
    fields: string[];
    filters?: Record<string, unknown>;
  }) => Promise<{ data: Array<Record<string, unknown>> }>;
};

const resolveOrderIdFromPayment = async (paymentId: string, container: any) => {
  const paymentService: IPaymentModuleService = container.resolve(Modules.PAYMENT);
  const payment = await paymentService.retrievePayment(paymentId, {
    relations: ['payment_collection'],
  });

  const paymentCollection = payment.payment_collection;
  const metadata = (paymentCollection?.metadata ?? {}) as Record<string, unknown>;
  const metadataOrderId =
    (metadata.order_id as string | undefined) ??
    (metadata.venmo_order_id as string | undefined);

  if (metadataOrderId) {
    return metadataOrderId;
  }

  if (!payment.payment_collection_id) {
    return null;
  }

  const query = container.resolve('query') as QueryGraph;
  const result = await query.graph({
    entity: 'order',
    fields: ['id'],
    filters: {
      payment_collections: {
        id: payment.payment_collection_id,
      },
    },
  });

  const order = result.data?.[0] as { id?: string } | undefined;
  return order?.id ?? null;
};

export default async function orderBatchAllocateSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) {
    return;
  }

  const orderId = await resolveOrderIdFromPayment(data.id, container);

  if (!orderId) {
    return;
  }

  await allocateVariantBatchesForOrder(orderId, container);
}

export const config: SubscriberConfig = {
  event: 'payment.captured',
};
