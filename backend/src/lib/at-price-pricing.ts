import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import type { IPricingModuleService, IStoreModuleService, PriceDTO } from '@medusajs/types';

import { VARIANT_BATCH_MODULE } from '../modules/variant-batch';
import type VariantBatchModuleService from '../modules/variant-batch/service';
import { AT_PRICE_CUSTOMER_GROUP_ID } from './constants';

const PRICE_LIST_METADATA_KEY = 'at_price_price_list_id';

type VariantPriceSetRow = {
  id: string;
  price_set?: {
    id?: string | null;
  } | null;
};

type QueryGraph = {
  graph: (args: {
    entity: string;
    fields: string[];
    filters?: Record<string, unknown>;
  }) => Promise<{ data: Array<Record<string, unknown>> }>;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getDefaultCurrencyCode = async (storeService: IStoreModuleService) => {
  const stores = await storeService.listStores();
  const store = stores?.[0];

  const defaultCurrency = store?.supported_currencies?.find((currency) => currency.is_default);
  return defaultCurrency?.currency_code ?? 'usd';
};

const ensureAtPriceList = async (scope: { resolve: <T = unknown>(key: string) => T }) => {
  if (!AT_PRICE_CUSTOMER_GROUP_ID) {
    return null;
  }

  const storeService = scope.resolve<IStoreModuleService>(Modules.STORE);
  const pricingService = scope.resolve<IPricingModuleService>(Modules.PRICING);

  const stores = await storeService.listStores();
  const store = stores?.[0];

  if (!store) {
    return null;
  }

  const metadata = (store.metadata ?? {}) as Record<string, unknown>;
  const existing = metadata[PRICE_LIST_METADATA_KEY];
  if (typeof existing === 'string' && existing.length > 0) {
    try {
      await pricingService.setPriceListRules({
        price_list_id: existing,
        rules: {
          'customer.groups.id': [AT_PRICE_CUSTOMER_GROUP_ID],
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update at-price list rules', error);
    }
    return existing;
  }

  const [priceList] = await pricingService.createPriceLists([
    {
      title: 'At Price',
      description: 'At price for authorized customers',
      status: 'active',
      type: 'override',
      rules: {
        'customer.groups.id': [AT_PRICE_CUSTOMER_GROUP_ID],
      },
    },
  ]);

  if (!priceList?.id) {
    return null;
  }

  await storeService.updateStores(store.id, {
    metadata: {
      ...metadata,
      [PRICE_LIST_METADATA_KEY]: priceList.id,
    },
  });

  return priceList.id;
};

const fetchVariantPriceSets = async (
  variantIds: string[],
  scope: { resolve: <T = unknown>(key: string) => T },
) => {
  if (!variantIds.length) {
    return new Map<string, string>();
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph;
  const result = await query.graph({
    entity: 'product_variant',
    fields: ['id', 'price_set.id'],
    filters: { id: variantIds },
  });
  const rows = result.data ?? [];
  const map = new Map<string, string>();

  (rows as VariantPriceSetRow[]).forEach((row) => {
    const priceSetId = row.price_set?.id;
    if (row.id && priceSetId) {
      map.set(row.id, priceSetId);
    }
  });

  return map;
};

const computeAtPricePerVariant = async (
  variantIds: string[],
  scope: { resolve: <T = unknown>(key: string) => T },
) => {
  const batchService = scope.resolve<VariantBatchModuleService>(VARIANT_BATCH_MODULE);

  const batches = await batchService.listVariantBatches({ variant_id: variantIds });
  const totals = new Map<string, { cost: number; quantity: number }>();

  batches.forEach((batch) => {
    const variantId = batch.variant_id;
    if (!variantId) {
      return;
    }
    const quantity = toNumber(batch.quantity) ?? 0;
    if (quantity <= 0) {
      return;
    }

    const supplierCost = toNumber((batch as { supplier_cost_per_vial?: number | null }).supplier_cost_per_vial) ?? 0;
    const testingCost = toNumber((batch as { testing_cost?: number | null }).testing_cost) ?? 0;
    const perVial = supplierCost + testingCost / quantity;

    if (!Number.isFinite(perVial) || perVial <= 0) {
      return;
    }

    const current = totals.get(variantId) ?? { cost: 0, quantity: 0 };
    totals.set(variantId, {
      cost: current.cost + perVial * quantity,
      quantity: current.quantity + quantity,
    });
  });

  const perVariant = new Map<string, number>();
  totals.forEach((entry, variantId) => {
    if (entry.quantity > 0) {
      perVariant.set(variantId, entry.cost / entry.quantity);
    }
  });

  return perVariant;
};

export const syncAtPricePriceListForVariants = async (
  variantIds: string[],
  scope: { resolve: <T = unknown>(key: string) => T },
) => {
  const uniqueVariantIds = Array.from(new Set(variantIds.filter(Boolean)));
  if (!uniqueVariantIds.length || !AT_PRICE_CUSTOMER_GROUP_ID) {
    return;
  }

  const priceListId = await ensureAtPriceList(scope);
  if (!priceListId) {
    return;
  }

  const storeService = scope.resolve<IStoreModuleService>(Modules.STORE);
  const pricingService = scope.resolve<IPricingModuleService>(Modules.PRICING);
  const currencyCode = await getDefaultCurrencyCode(storeService);

  const priceSetByVariant = await fetchVariantPriceSets(uniqueVariantIds, scope);
  const priceSetIds = Array.from(new Set(Array.from(priceSetByVariant.values())));
  if (!priceSetIds.length) {
    return;
  }

  const atPriceByVariant = await computeAtPricePerVariant(uniqueVariantIds, scope);
  const basePrices = await pricingService.calculatePrices(
    { id: priceSetIds },
    { context: { currency_code: currencyCode } },
  );

  const baseByPriceSet = new Map<string, number>();
  basePrices.forEach((priceSet) => {
    const amount = toNumber(priceSet.calculated_amount ?? priceSet.original_amount);
    if (priceSet.id && amount !== null) {
      baseByPriceSet.set(priceSet.id, amount);
    }
  });

  const existingPrices = await pricingService.listPrices({
    price_list_id: [priceListId],
    price_set_id: priceSetIds,
  });

  const existingByPriceSet = new Map<string, PriceDTO>();
  existingPrices.forEach((price) => {
    if (price.price_set_id && price.currency_code === currencyCode) {
      existingByPriceSet.set(price.price_set_id, price);
    }
  });

  const create: Array<{ currency_code: string; amount: number; price_set_id: string }> = [];
  const update: Array<{ id: string; currency_code: string; amount: number; price_set_id: string }> = [];

  uniqueVariantIds.forEach((variantId) => {
    const priceSetId = priceSetByVariant.get(variantId);
    if (!priceSetId) {
      return;
    }

    const atPrice = atPriceByVariant.get(variantId);
    const baseAmount = baseByPriceSet.get(priceSetId);

    const amount = atPrice !== undefined && atPrice !== null
      ? Math.round(atPrice * 100)
      : baseAmount ?? null;

    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const existing = existingByPriceSet.get(priceSetId);
    if (existing?.id) {
      if (existing.amount !== amount) {
        update.push({
          id: existing.id,
          amount,
          currency_code: currencyCode,
          price_set_id: priceSetId,
        });
      }
      return;
    }

    create.push({
      amount,
      currency_code: currencyCode,
      price_set_id: priceSetId,
    });
  });

  if (create.length) {
    await pricingService.addPriceListPrices([
      {
        price_list_id: priceListId,
        prices: create,
      },
    ]);
  }

  if (update.length) {
    await pricingService.updatePriceListPrices([
      {
        price_list_id: priceListId,
        prices: update,
      },
    ]);
  }
};
