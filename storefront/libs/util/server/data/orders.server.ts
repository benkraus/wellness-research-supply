import { medusaError } from '@libs/util/medusaError';
import { baseMedusaConfig, getPublishableKey, sdk } from '@libs/util/server/client.server';
import { withAuthHeaders } from '../auth.server';

export const retrieveOrder = withAuthHeaders(async (request, authHeaders, id: string) => {
  return sdk.store.order
    .retrieve(id, { fields: '*payment_collections.payments' }, authHeaders)
    .then(({ order }) => order)
    .catch(medusaError);
});

export const listOrders = withAuthHeaders(async (request, authHeaders, limit: number = 10, offset: number = 0) => {
  return sdk.store.order
    .list({ limit, offset }, authHeaders)
    .then(({ orders }) => orders)
    .catch(medusaError);
});

export const listOrdersWithCount = withAuthHeaders(
  async (request, authHeaders, limit: number = 10, offset: number = 0) => {
    return sdk.store.order
      .list({ limit, offset }, authHeaders)
      .then(({ orders, count, offset: responseOffset, limit: responseLimit }) => ({
        orders,
        count: count ?? orders.length,
        offset: responseOffset ?? offset,
        limit: responseLimit ?? limit,
      }))
      .catch(medusaError);
  },
);

export const listOrderVariantBatches = withAuthHeaders(async (request, authHeaders, id: string) => {
  const publishableKey = await getPublishableKey();
  const url = new URL(`/store/orders/${id}/variant-batches`, baseMedusaConfig.baseUrl);

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...(publishableKey ? { 'x-publishable-api-key': publishableKey } : {}),
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load batch allocations.');
  }

  return (await response.json()) as {
    order_id: string;
    items: Array<{
      line_item_id: string;
      product_title?: string | null;
      variant_title?: string | null;
      quantity: number;
      batches: Array<{
        id: string;
        lot_number: string;
        quantity: number;
        coa_available: boolean;
        coa_url: string | null;
      }>;
    }>;
  };
});

export const listOrdersTracking = withAuthHeaders(async (request, authHeaders, orderIds: string[]) => {
  const publishableKey = await getPublishableKey();
  const url = new URL('/store/orders/tracking', baseMedusaConfig.baseUrl);

  if (orderIds.length > 0) {
    url.searchParams.set('order_ids', orderIds.join(','));
  }

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...(publishableKey ? { 'x-publishable-api-key': publishableKey } : {}),
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load order tracking.');
  }

  return (await response.json()) as {
    orders: Array<{
      order_id: string;
      latest_update?: string | null;
      packages: Array<{
        tracking_number: string;
        tracking_status?: string | null;
        tracking_url?: string | null;
        label_url?: string | null;
        shipped_at?: string | null;
      }>;
    }>;
  };
});
