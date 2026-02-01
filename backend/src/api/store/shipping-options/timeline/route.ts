import type { MedusaResponse, MedusaStoreRequest } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';
import type { ICartModuleService, IStockLocationService } from '@medusajs/types';

import { SHIPSTATION_API_KEY } from '../../../../lib/constants';
import { ShipStationClient } from '../../../../modules/shipstation/client';
import type { ShipStationAddress } from '../../../../modules/shipstation/types';

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

export const POST = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  if (!SHIPSTATION_API_KEY) {
    return res.status(500).json({ error: 'ShipStation API key is not configured.' });
  }

  const body = (req.body ?? {}) as TimelineRequestBody;
  const cartId = body.cart_id;
  const options = body.options ?? [];

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

  const totalItems = (cart.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
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

  const client = new ShipStationClient({ api_key: SHIPSTATION_API_KEY });
  const currencyCode = cart.currency_code || 'usd';

  const timelines = await Promise.all(
    options.map(async (option) => {
      const carrierId = option.data?.carrier_id;
      const serviceCode = option.data?.carrier_service_code;

      if (!carrierId || !serviceCode) {
        return [option.id, null] as const;
      }

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
    }),
  );

  return res.status(200).json({
    timelines: Object.fromEntries(timelines),
  });
};
