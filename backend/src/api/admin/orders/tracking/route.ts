import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import type { IFulfillmentModuleService } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules, remoteQueryObjectFromString } from '@medusajs/framework/utils';

import { getFulfillmentLatestTrackingUpdate, getFulfillmentTrackingPackages } from '../../../../lib/shipstation-tracking';

type OrderRow = {
  id: string;
  display_id?: number | null;
  status?: string | null;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FulfillmentRow = {
  id: string;
  order_id?: string | null;
  updated_at?: string | null;
  shipped_at?: string | null;
  metadata?: Record<string, unknown> | null;
  labels?: Array<{
    tracking_number: string;
    tracking_url?: string | null;
    label_url?: string | null;
  }> | null;
};

const isPackageOverdue = (pkg: { shipped_at?: string | null; tracking_status?: string | null }) => {
  if (!pkg.shipped_at) return false;
  if (pkg.tracking_status === 'delivered') return false;
  const shippedDate = new Date(pkg.shipped_at);
  if (Number.isNaN(shippedDate.getTime())) return false;
  const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
  return shippedDate.getTime() < fiveDaysAgo;
};

const normalizeIsoDate = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const limit = Math.min(Number(req.query.limit ?? 25) || 25, 100);
  const take = Math.min(limit * 6, 300);

  const fulfillmentModuleService = req.scope.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT);
  const fulfillments = await fulfillmentModuleService.listFulfillments(
    { provider_id: 'shipstation' },
    { order: { updated_at: 'DESC' }, take },
  );

  // biome-ignore lint/complexity/useOptionalChain: fulfillment entries are filtered before use
  const fulfillmentRows: FulfillmentRow[] = fulfillments
    .filter((fulfillment): fulfillment is NonNullable<typeof fulfillment> => Boolean(fulfillment))
    .map((fulfillment) => {
    const labels = fulfillment?.labels?.flatMap((label) => {
      if (!label.tracking_number) {
        return [];
      }
      return [
        {
          tracking_number: label.tracking_number,
          tracking_url: label.tracking_url ?? null,
          label_url: label.label_url ?? null,
        },
      ];
    }) ?? [];
    const normalizedLabels = labels?.length ? labels : null;

      return {
        id: fulfillment.id,
        order_id: fulfillment.order_id ?? null,
        updated_at: normalizeIsoDate(fulfillment?.updated_at),
        shipped_at: normalizeIsoDate(fulfillment?.shipped_at),
        metadata: fulfillment.metadata ?? null,
        labels: normalizedLabels,
      };
    });

  const orderTrackingMap = new Map<
    string,
    { packages: ReturnType<typeof getFulfillmentTrackingPackages>; latest_update: string | null }
  >();

  fulfillmentRows.forEach((fulfillment) => {
    const packages = getFulfillmentTrackingPackages(fulfillment);
    if (packages.length === 0) {
      return;
    }
    const orderId = fulfillment.order_id ?? undefined;
    if (!orderId) {
      return;
    }

    const latestUpdate =
      getFulfillmentLatestTrackingUpdate(fulfillment) ??
      (fulfillment.updated_at ?? null);

    const existing = orderTrackingMap.get(orderId);
    if (!existing) {
      orderTrackingMap.set(orderId, { packages: [...packages], latest_update: latestUpdate });
      return;
    }

    existing.packages.push(...packages);
    if (latestUpdate) {
      const existingDate = existing.latest_update ? new Date(existing.latest_update).getTime() : 0;
      const incomingDate = new Date(latestUpdate).getTime();
      if (!Number.isNaN(incomingDate) && incomingDate > existingDate) {
        existing.latest_update = latestUpdate;
      }
    }
  });

  const sortedTracking = Array.from(orderTrackingMap.entries())
    .map(([orderId, data]) => ({
      orderId,
      packages: data.packages,
      latest_update: data.latest_update,
    }))
    .sort((a, b) => {
      const aTime = a.latest_update ? new Date(a.latest_update).getTime() : 0;
      const bTime = b.latest_update ? new Date(b.latest_update).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);

  const orderIds = sortedTracking.map((entry) => entry.orderId);
  if (orderIds.length === 0) {
    return res.status(200).json({ orders: [] });
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const query = remoteQueryObjectFromString({
    entryPoint: 'orders',
    variables: {
      filters: { id: orderIds },
      take: orderIds.length,
    },
    fields: ['id', 'display_id', 'status', 'email', 'created_at', 'updated_at'],
  });

  const { rows } = (await remoteQuery(query)) as { rows: OrderRow[] };
  const orderById = new Map(rows.map((row) => [row.id, row]));

  const orders = sortedTracking
    .map((entry) => {
      const order = orderById.get(entry.orderId);
      if (!order) return null;
      const overdue = entry.packages.some((pkg) => isPackageOverdue(pkg));
      return {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        email: order.email,
        created_at: order.created_at,
        updated_at: order.updated_at,
        packages: entry.packages,
        latest_update: entry.latest_update,
        overdue,
      };
    })
    .filter((order): order is NonNullable<typeof order> => Boolean(order));

  return res.status(200).json({ orders });
};
