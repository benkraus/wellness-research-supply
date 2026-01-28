import type { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa';

import { releaseVariantBatchAllocationsForOrder } from '../lib/variant-batch-allocations';

export default async function orderBatchReleaseSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) {
    return;
  }

  await releaseVariantBatchAllocationsForOrder(data.id, container);
}

export const config: SubscriberConfig = {
  event: 'order.canceled',
};
