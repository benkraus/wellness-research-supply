import { medusaError } from '@libs/util/medusaError';
import { sdk } from '@libs/util/server/client.server';
import { HttpTypes } from '@medusajs/types';
import { withAuthHeaders } from '../auth.server';

type EdebitSavedMethod = {
  id: string;
  label?: string;
  bank_name?: string;
  account_last4?: string;
  routing_last4?: string;
  created_at?: string;
  encrypted?: string;
  is_default?: boolean;
};

const sanitizeEdebitMethods = (methods: unknown) => {
  if (!Array.isArray(methods)) return methods;

  return methods.map((method) => {
    if (!method || typeof method !== 'object') return method;
    const record = { ...(method as Record<string, unknown>) };
    delete record.encrypted;
    return record;
  });
};

const sanitizeCustomer = (customer: HttpTypes.StoreCustomer | null) => {
  if (!customer) return customer;
  const metadata = (customer.metadata ?? {}) as Record<string, unknown>;

  if (!metadata.edebit_payment_methods) {
    return customer;
  }

  return {
    ...customer,
    metadata: {
      ...metadata,
      edebit_payment_methods: sanitizeEdebitMethods(metadata.edebit_payment_methods),
    },
  } as HttpTypes.StoreCustomer;
};

export const getCustomer = withAuthHeaders(async (request, authHeaders) => {
  const customer = await sdk.store.customer
    .retrieve({}, authHeaders)
    .then(({ customer }) => customer)
    .catch(() => null);

  return sanitizeCustomer(customer);
});

export const getCustomerWithSensitive = withAuthHeaders(async (request, authHeaders) => {
  return await sdk.store.customer
    .retrieve({}, authHeaders)
    .then(({ customer }) => customer)
    .catch(() => null);
});

export const updateCustomer = withAuthHeaders(async (request, authHeaders, body: HttpTypes.StoreUpdateCustomer) => {
  const updateRes = await sdk.store.customer
    .update(body, {}, authHeaders)
    .then(({ customer }) => customer)
    .catch(medusaError);

  return updateRes;
});

export const upsertEdebitSavedMethod = withAuthHeaders(
  async (request, authHeaders, method: EdebitSavedMethod) => {
    const customer = await sdk.store.customer
      .retrieve({}, authHeaders)
      .then(({ customer }) => customer)
      .catch(() => null);

    if (!customer) {
      throw new Error('Customer not found');
    }

    const metadata = (customer.metadata ?? {}) as Record<string, unknown>;
    const existing = Array.isArray(metadata.edebit_payment_methods)
      ? (metadata.edebit_payment_methods as EdebitSavedMethod[])
      : [];

    const hasDefault = existing.some((entry) => entry.is_default);
    const nextMethod = {
      ...method,
      is_default: method.is_default ?? (!hasDefault ? true : false),
    };

    const updated = [
      ...existing.map((entry) => ({
        ...entry,
        is_default: nextMethod.is_default ? false : entry.is_default,
      })),
      nextMethod,
    ];

    const updatedCustomer = await sdk.store.customer
      .update(
        {
          metadata: {
            ...metadata,
            edebit_payment_methods: updated,
          },
        },
        {},
        authHeaders,
      )
      .then(({ customer }) => customer)
      .catch(medusaError);

    return updatedCustomer;
  },
);
