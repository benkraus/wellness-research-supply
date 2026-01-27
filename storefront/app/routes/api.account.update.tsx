import { getCustomer, updateCustomer } from '@libs/util/server/data/customer.server';
import { data } from 'react-router';
import { normalizePhoneNumber } from '@libs/util/phoneNumber';

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const normalizedPhone = normalizePhoneNumber(phone);

  const customer = await getCustomer(request);

  if (!customer) {
    return data({ error: 'You must be signed in.' }, { status: 401 });
  }

  if (customer.metadata?.email_verified === false) {
    return data({ error: 'Please verify your email before updating your account.' }, { status: 403 });
  }

  if (!firstName || !lastName) {
    return data({ error: 'First name and last name are required.' }, { status: 400 });
  }

  try {
    await updateCustomer(request, {
      first_name: firstName,
      last_name: lastName,
      phone: normalizedPhone || undefined,
    });
  } catch (error) {
    return data({ error: error instanceof Error ? error.message : 'Unable to update account.' }, { status: 400 });
  }

  return data({ success: true });
};
