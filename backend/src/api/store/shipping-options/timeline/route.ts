import type { MedusaResponse, MedusaStoreRequest } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';
import type { ICartModuleService, IStockLocationService } from '@medusajs/types';

import { SHIPSTATION_API_KEY } from '../../../../lib/constants';
import { ShipStationClient } from '../../../../modules/shipstation/client';
import type { ShipStationAddress } from '../../../../modules/shipstation/types';

const SHIPSTATION_TIMELINE_MAX_OPTIONS = 20;
const SHIPSTATION_TIMELINE_CONCURRENCY = 4;
const SHIPSTATION_REQUEST_TIMEOUT_MS = 8_000;

type TimelineOption = {
  id: string;
  data?: {
    carrier_id?: string;
    carrier_service_code?: string;
  } | null;
};

type TimelineRequestBody = {
  cart_id?: string;
  options?: TimelineOption[];
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(safeLimit, items.length) }, async () => {
    for (;;) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await fn(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

export const POST = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  if (!SHIPSTATION_API_KEY) {
    return res.status(500).json({ error: 'ShipStation API key is not configured.' });
  }

  const body = (req.body ?? {}) as TimelineRequestBody;
  const cartId = body.cart_id;
  const options = (body.options ?? []).slice(0, SHIPSTATION_TIMELINE_MAX_OPTIONS);

  if (!cartId) {
    return res.status(400).json({ error: 'cart_id is required.' });
  }

  if (!options.length) {
    return res.status(200).json({ timelines: {} });
  }

  const cartModuleService = req.scope.resolve<ICartModuleService>(Modules.CART);
  const stockLocationService = req.scope.resolve<IStockLocationService>(Modules.STOCK_LOCATION);

  const cart = await cartModuleService.retrieveCart(cartId, {
    relations: ['shipping_address', 'items'],
  });

  if (!cart?.shipping_address) {
    return res.status(400).json({ error: 'shipping_address is required.' });
  }

  const [stockLocation] = await stockLocationService.listStockLocations(
    {},
    {
      relations: ['address'],
      take: 1,
    },
  );

  if (!stockLocation?.address) {
    return res.status(400).json({ error: 'stock location address is required.' });
  }

  const shipFrom: ShipStationAddress = {
    name: stockLocation.name || '',
    phone: stockLocation.address.phone || '',
    address_line1: stockLocation.address.address_1 || '',
    city_locality: stockLocation.address.city || '',
    state_province: stockLocation.address.province || '',
    postal_code: stockLocation.address.postal_code || '',
    country_code: stockLocation.address.country_code || '',
    address_residential_indicator: 'unknown',
  };

  const shipTo: ShipStationAddress = {
    name: `${cart.shipping_address.first_name || ''} ${cart.shipping_address.last_name || ''}`.trim(),
    phone: cart.shipping_address.phone || '',
    address_line1: cart.shipping_address.address_1 || '',
    city_locality: cart.shipping_address.city || '',
    state_province: cart.shipping_address.province || '',
    postal_code: cart.shipping_address.postal_code || '',
    country_code: cart.shipping_address.country_code || '',
    address_residential_indicator: 'unknown',
  };

  const totalItems = (cart.items ?? []).reduce((sum, item) => {
    const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity ?? 0);
    return sum + (Number.isNaN(quantity) ? 0 : quantity);
  }, 0);
  const packageCount = Math.max(1, Math.ceil(totalItems / 10));
  const packages = Array.from({ length: packageCount }, () => ({
    weight: {
      value: 4,
      unit: 'ounce',
    },
    dimensions: {
      unit: 'inch',
      length: 6,
      width: 4,
      height: 1,
    },
  }));

  const items = (cart.items ?? []).map((item) => ({
    name: item.title || '',
    quantity: typeof item.quantity === 'number' ? item.quantity : 0,
    sku: typeof item.variant_sku === 'string' ? item.variant_sku : '',
  }));

  const client = new ShipStationClient({
    api_key: SHIPSTATION_API_KEY,
    timeout_ms: SHIPSTATION_REQUEST_TIMEOUT_MS,
  });
  const currencyCode = cart.currency_code || 'usd';

  const timelines = await mapWithConcurrency(
    options,
    SHIPSTATION_TIMELINE_CONCURRENCY,
    async (option) => {
      const carrierId = option.data?.carrier_id;
      const serviceCode = option.data?.carrier_service_code;

      if (!carrierId || !serviceCode) {
        return [option.id, null] as const;
      }

      try {
        const shipment = await client.getShippingRates({
          shipment: {
            carrier_id: carrierId,
            service_code: serviceCode,
            ship_to: shipTo,
            ship_from: shipFrom,
            validate_address: 'no_validation',
            items,
            packages,
            customs: {
              contents: 'merchandise',
              non_delivery: 'return_to_sender',
            },
          },
          rate_options: {
            carrier_ids: [carrierId],
            service_codes: [serviceCode],
            preferred_currency: currencyCode,
          },
        });

        const rate = shipment.rate_response?.rates?.[0];
        if (!rate) {
          return [option.id, null] as const;
        }

        return [
          option.id,
          {
            carrier_delivery_days: rate.carrier_delivery_days,
            delivery_days: rate.delivery_days,
            delivery_date: rate.delivery_date,
          },
        ] as const;
      } catch (e: any) {
        console.warn('[ShipStation] Failed to fetch timeline for shipping option', {
          option_id: option.id,
          carrier_id: carrierId,
          carrier_service_code: serviceCode,
          error: e?.message ?? String(e),
        });
        return [option.id, null] as const;
      }
    },
  );

  return res.status(200).json({
    timelines: Object.fromEntries(timelines),
  });
};
