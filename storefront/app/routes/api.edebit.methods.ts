import { updateCustomer } from '@libs/util/server/data/customer.server';
import { getCustomerWithSensitive } from '@libs/util/server/data/customer.server';
import type { ActionFunctionArgs } from 'react-router';
import { data as remixData } from 'react-router';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

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

const actionSchema = z.object({
  action: z.enum(['delete', 'default', 'create', 'update']),
  methodId: z.string().optional(),
  label: z.string().optional(),
  accountName: z.string().optional(),
  bankName: z.string().optional(),
  routingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  phone: z.string().optional(),
  makeDefault: z.string().optional(),
});

const sanitizeMethods = (methods: EdebitSavedMethod[]) => {
  return methods.map(({ encrypted, ...rest }) => rest);
};

const ensureDefault = (methods: EdebitSavedMethod[]) => {
  if (methods.length === 0) return methods;
  if (methods.some((method) => method.is_default)) return methods;
  const [first, ...rest] = methods;
  return [{ ...first, is_default: true }, ...rest.map((method) => ({ ...method, is_default: false }))];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const parsed = actionSchema.safeParse(payload);

  if (!parsed.success) {
    return remixData({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { action, methodId } = parsed.data;
  const customer = await getCustomerWithSensitive(request);

  if (!customer?.id) {
    return remixData({ errors: { root: { message: 'Sign in to manage saved bank accounts.' } } }, { status: 401 });
  }

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>;
  const existing = Array.isArray(metadata.edebit_payment_methods)
    ? (metadata.edebit_payment_methods as EdebitSavedMethod[])
    : [];

  let updated = [...existing];

  if (action === 'delete') {
    if (!methodId) {
      return remixData({ errors: { root: { message: 'Saved bank account not found.' } } }, { status: 404 });
    }
    updated = updated.filter((method) => method.id !== methodId);
    updated = ensureDefault(updated);
  }

  if (action === 'default') {
    if (!methodId) {
      return remixData({ errors: { root: { message: 'Saved bank account not found.' } } }, { status: 404 });
    }
    const found = updated.some((method) => method.id === methodId);
    if (!found) {
      return remixData(
        { errors: { root: { message: 'Saved bank account not found.' } } },
        { status: 404 },
      );
    }

    updated = updated.map((method) => ({
      ...method,
      is_default: method.id === methodId,
    }));
  }

  if (action === 'create' || action === 'update') {
    const accountName = parsed.data.accountName?.trim();
    const bankName = parsed.data.bankName?.trim();
    const routingNumber = (parsed.data.routingNumber ?? '').replace(/\D/g, '');
    const accountNumber = (parsed.data.accountNumber ?? '').replace(/\D/g, '');
    const phone = (parsed.data.phone ?? '').trim();
    const makeDefault = parsed.data.makeDefault === 'on';
    const labelOverride = parsed.data.label?.trim();

    if (!accountName || !bankName || !routingNumber || !accountNumber || !phone) {
      return remixData(
        { errors: { root: { message: 'All bank account fields are required.' } } },
        { status: 400 },
      );
    }

    if (routingNumber.length !== 9) {
      return remixData(
        { errors: { root: { message: 'Routing number must be 9 digits.' } } },
        { status: 400 },
      );
    }

    if (accountNumber.length < 4) {
      return remixData(
        { errors: { root: { message: 'Account number must be at least 4 digits.' } } },
        { status: 400 },
      );
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return remixData(
        { errors: { root: { message: 'A valid phone number is required.' } } },
        { status: 400 },
      );
    }

    const encryptionKey = process.env.EDEBIT_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return remixData(
        { errors: { root: { message: 'eDebit is not configured. Please contact support.' } } },
        { status: 400 },
      );
    }

    const { encryptEdebitPayload } = await import('@libs/util/server/edebit-encryption.server');
    const encrypted = encryptEdebitPayload(
      {
        account_name: accountName,
        routing_number: routingNumber,
        account_number: accountNumber,
        bank_name: bankName,
        phone,
      },
      encryptionKey,
    );

    const nextId = action === 'update' ? methodId : randomUUID();

    if (action === 'update' && !nextId) {
      return remixData({ errors: { root: { message: 'Saved bank account not found.' } } }, { status: 404 });
    }

    const existingMethod = updated.find((method) => method.id === nextId);

    if (action === 'update' && !existingMethod) {
      return remixData({ errors: { root: { message: 'Saved bank account not found.' } } }, { status: 404 });
    }

    const shouldBeDefault = makeDefault || !updated.some((method) => method.is_default);

    const nextLabel =
      labelOverride ||
      [bankName, accountNumber ? `•••• ${accountNumber.slice(-4)}` : null].filter(Boolean).join(' ');

    const nextMethod: EdebitSavedMethod = {
      id: nextId as string,
      label: nextLabel || undefined,
      bank_name: bankName,
      account_last4: accountNumber.slice(-4),
      routing_last4: routingNumber.slice(-4),
      encrypted,
      created_at: existingMethod?.created_at ?? new Date().toISOString(),
      is_default: shouldBeDefault ? true : existingMethod?.is_default ?? false,
    };

    if (action === 'create') {
      updated = updated.map((method) => ({
        ...method,
        is_default: shouldBeDefault ? false : method.is_default,
      }));
      updated.push(nextMethod);
    }

    if (action === 'update') {
      updated = updated.map((method) => {
        if (method.id !== nextMethod.id) {
          return {
            ...method,
            is_default: shouldBeDefault ? false : method.is_default,
          };
        }
        return nextMethod;
      });
      updated = ensureDefault(updated);
    }
  }

  await updateCustomer(request, {
    metadata: {
      ...metadata,
      edebit_payment_methods: updated,
    },
  });

  return remixData({ methods: sanitizeMethods(updated), success: true });
}
