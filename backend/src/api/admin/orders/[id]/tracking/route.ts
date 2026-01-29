import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from '@medusajs/framework/utils';

import { getFulfillmentLatestTrackingUpdate, getFulfillmentTrackingPackages } from '../../../../../lib/shipstation-tracking';

type OrderRow = {
  id: string;
  display_id?: number | null;
  status?: string | null;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  fulfillments?: Array<{
    id: string;
    shipped_at?: string | null;
    metadata?: Record<string, unknown> | null;
    labels?: Array<{
      tracking_number: string;
      tracking_url?: string | null;
      label_url?: string | null;
    }> | null;
  }>;
};

const isPackageOverdue = (pkg: { shipped_at?: string | null; tracking_status?: string | null }) => {
  if (!pkg.shipped_at) return false;
  if (pkg.tracking_status === 'delivered') return false;
  const shippedDate = new Date(pkg.shipped_at);
  if (Number.isNaN(shippedDate.getTime())) return false;
  const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
  return shippedDate.getTime() < fiveDaysAgo;
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params as { id: string };
  if (!id) {
    return res.status(400).json({ error: 'Order id is required.' });
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const query = remoteQueryObjectFromString({
    entryPoint: 'orders',
    variables: {
      filters: { id },
      take: 1,
    },
    fields: [
      'id',
      'display_id',
      'status',
      'email',
      'created_at',
      'updated_at',
      'fulfillments.id',
      'fulfillments.shipped_at',
      'fulfillments.metadata',
      'fulfillments.labels.tracking_number',
      'fulfillments.labels.tracking_url',
      'fulfillments.labels.label_url',
    ],
  });

  const { rows } = (await remoteQuery(query)) as { rows: OrderRow[] };
  const order = rows[0];

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const fulfillments = order.fulfillments ?? [];
  const packages = fulfillments.flatMap((fulfillment) =>
    getFulfillmentTrackingPackages(fulfillment),
  );
  const latestUpdate = fulfillments
    .map((fulfillment) => getFulfillmentLatestTrackingUpdate(fulfillment))
    .filter(Boolean)
    .sort()
    .pop() ?? null;
  const overdue = packages.some((pkg) => isPackageOverdue(pkg));

  return res.status(200).json({
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      email: order.email,
      created_at: order.created_at,
      updated_at: order.updated_at,
    },
    packages,
    latest_update: latestUpdate,
    overdue,
  });
};
