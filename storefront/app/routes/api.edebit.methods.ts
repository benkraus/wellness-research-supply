import { updateCustomer } from '@libs/util/server/data/customer.server';
import { getCustomerWithSensitive } from '@libs/util/server/data/customer.server';
import type { ActionFunctionArgs } from 'react-router';
import { data as remixData } from 'react-router';
import { z } from 'zod';

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
  action: z.enum(['delete', 'default']),
  methodId: z.string().min(1),
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
    updated = updated.filter((method) => method.id !== methodId);
    updated = ensureDefault(updated);
  }

  if (action === 'default') {
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

  await updateCustomer(request, {
    metadata: {
      ...metadata,
      edebit_payment_methods: updated,
    },
  });

  return remixData({ methods: sanitizeMethods(updated) });
}
