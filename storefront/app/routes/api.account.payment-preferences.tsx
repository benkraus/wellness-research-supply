import { getCustomer, updateCustomer } from '@libs/util/server/data/customer.server';
import { data } from 'react-router';
import { z } from 'zod';

const paymentPreferencesSchema = z.object({
  venmoUseProfile: z.string().optional(),
  venmoContact: z.string().optional(),
});

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const parsed = paymentPreferencesSchema.safeParse(payload);

  if (!parsed.success) {
    return data({ error: 'Invalid payment preferences.' }, { status: 400 });
  }

  const customer = await getCustomer(request);

  if (!customer) {
    return data({ error: 'You must be signed in.' }, { status: 401 });
  }

  if (customer.metadata?.email_verified === false) {
    return data({ error: 'Please verify your email before updating your account.' }, { status: 403 });
  }

  const venmoUseProfile = parsed.data.venmoUseProfile === 'on';
  const venmoContact = String(parsed.data.venmoContact ?? '').trim();

  if (!venmoUseProfile && !venmoContact) {
    return data({ error: 'Enter a Venmo email, phone number, or username.' }, { status: 400 });
  }

  try {
    await updateCustomer(request, {
      metadata: {
        ...(customer.metadata ?? {}),
        venmo_default_use_profile: venmoUseProfile,
        venmo_default_contact: venmoContact || null,
      },
    });
  } catch (error) {
    return data({ error: error instanceof Error ? error.message : 'Unable to update payment preferences.' }, { status: 400 });
  }

  return data({ success: true });
};
