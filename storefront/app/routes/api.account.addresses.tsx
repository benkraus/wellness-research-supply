import { data } from 'react-router';
import { addressPayload, addressToMedusaAddress } from '@libs/util/addresses';
import { normalizePhoneNumber } from '@libs/util/phoneNumber';
import { getAuthHeaders } from '@libs/util/server/auth.server';
import { baseMedusaConfig } from '@libs/util/server/client.server';
import { getCustomer } from '@libs/util/server/data/customer.server';

const buildAddressFromForm = (formData: FormData, prefix = 'address') => {
  const getValue = (key: string) => String(formData.get(`${prefix}.${key}`) || '').trim();

  return {
    firstName: getValue('firstName'),
    lastName: getValue('lastName'),
    company: getValue('company'),
    address1: getValue('address1'),
    address2: getValue('address2'),
    city: getValue('city'),
    province: getValue('province'),
    countryCode: getValue('countryCode'),
    postalCode: getValue('postalCode'),
    phone: normalizePhoneNumber(getValue('phone')) || getValue('phone'),
  };
};

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const intent = String(formData.get('intent') || '').trim();
  const addressId = String(formData.get('address_id') || '').trim();
  const setDefault = formData.get('set_default') === 'on';

  const authHeaders = await getAuthHeaders(request);
  if (!('authorization' in authHeaders)) {
    return data({ error: 'You must be signed in.' }, { status: 401 });
  }

  const customer = await getCustomer(request);
  if (!customer) {
    return data({ error: 'You must be signed in.' }, { status: 401 });
  }

  if (customer.metadata?.email_verified === false) {
    return data({ error: 'Please verify your email before managing addresses.' }, { status: 403 });
  }

  const headers = {
    'content-type': 'application/json',
    'x-publishable-api-key': baseMedusaConfig.publishableKey ?? '',
    ...(authHeaders as Record<string, string>),
  };

  try {
    if (intent === 'create') {
      const address = buildAddressFromForm(formData);
      const payload = addressPayload(addressToMedusaAddress(address));
      if (setDefault) {
        (payload as Record<string, unknown>).is_default_shipping = true;
      }

      const response = await fetch(new URL('/store/customers/me/addresses', baseMedusaConfig.baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return data({ error: 'Unable to save address.' }, { status: response.status });
      }

      return data({ success: true });
    }

    if (intent === 'update') {
      if (!addressId) {
        return data({ error: 'Address ID is required.' }, { status: 400 });
      }

      const address = buildAddressFromForm(formData);
      const payload = addressPayload(addressToMedusaAddress(address));
      if (setDefault) {
        (payload as Record<string, unknown>).is_default_shipping = true;
      }

      const response = await fetch(
        new URL(`/store/customers/me/addresses/${addressId}`, baseMedusaConfig.baseUrl),
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        return data({ error: 'Unable to update address.' }, { status: response.status });
      }

      return data({ success: true });
    }

    if (intent === 'delete') {
      if (!addressId) {
        return data({ error: 'Address ID is required.' }, { status: 400 });
      }

      const response = await fetch(
        new URL(`/store/customers/me/addresses/${addressId}`, baseMedusaConfig.baseUrl),
        {
          method: 'DELETE',
          headers,
        },
      );

      if (!response.ok) {
        return data({ error: 'Unable to remove address.' }, { status: response.status });
      }

      return data({ success: true });
    }

    if (intent === 'set-default') {
      if (!addressId) {
        return data({ error: 'Address ID is required.' }, { status: 400 });
      }

      const response = await fetch(
        new URL(`/store/customers/me/addresses/${addressId}`, baseMedusaConfig.baseUrl),
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ is_default_shipping: true }),
        },
      );

      if (!response.ok) {
        return data({ error: 'Unable to set default address.' }, { status: response.status });
      }

      return data({ success: true });
    }

    return data({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update addresses.';
    return data({ error: message }, { status: 400 });
  }
};
