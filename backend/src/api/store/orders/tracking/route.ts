import type { MedusaResponse, MedusaStoreRequest } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from '@medusajs/framework/utils';

import { getFulfillmentLatestTrackingUpdate, getFulfillmentTrackingPackages } from '../../../../lib/shipstation-tracking';

type OrderRow = {
  id: string;
  fulfillments?: Array<{
    id: string;
    shipped_at?: string | null;
    metadata?: Record<string, unknown> | null;
    labels?: Array<{
      id?: string;
      tracking_number: string;
      tracking_url?: string | null;
      label_url?: string | null;
    }> | null;
  }>;
};

export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const authContext = req.auth_context;

  if (!authContext || authContext.actor_type !== 'customer') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const orderIdsParam = (req.query.order_ids as string | undefined) ?? '';
  const orderIds = orderIdsParam
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const limit = Math.min(Number(req.query.limit ?? 25) || 25, 100);

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const query = remoteQueryObjectFromString({
    entryPoint: 'orders',
    variables: {
      filters: {
        ...(orderIds.length ? { id: orderIds } : {}),
        customer_id: authContext.actor_id,
      },
      take: orderIds.length ? orderIds.length : limit,
    },
    fields: [
      'id',
      'fulfillments.id',
      'fulfillments.shipped_at',
      'fulfillments.metadata',
      'fulfillments.labels.tracking_number',
      'fulfillments.labels.tracking_url',
      'fulfillments.labels.label_url',
    ],
  });

  const { rows } = (await remoteQuery(query)) as { rows: OrderRow[] };

  const orders = rows.map((order) => {
    const fulfillments = order.fulfillments ?? [];
    const packages = fulfillments.flatMap((fulfillment) =>
      getFulfillmentTrackingPackages(fulfillment),
    );
    const latestUpdate = fulfillments
      .map((fulfillment) => getFulfillmentLatestTrackingUpdate(fulfillment))
      .filter(Boolean)
      .sort()
      .pop() ?? null;

    return {
      order_id: order.id,
      packages,
      latest_update: latestUpdate,
    };
  });

  return res.status(200).json({ orders });
};
