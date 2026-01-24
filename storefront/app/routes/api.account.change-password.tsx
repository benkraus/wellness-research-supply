import { sdk, baseMedusaConfig } from '@libs/util/server/client.server';
import { config } from '@libs/util/server/config.server';
import { setAuthToken } from '@libs/util/server/cookies.server';
import { getCustomer } from '@libs/util/server/data/customer.server';
import { data } from 'react-router';

const getStorefrontUrl = (request: Request) => {
  return config.STOREFRONT_URL ?? new URL(request.url).origin;
};

export const action = async ({ request }: { request: Request }) => {
  const MIN_PASSWORD_LENGTH = 10;
  const formData = await request.formData();
  const currentPassword = String(formData.get('current_password') || '').trim();
  const newPassword = String(formData.get('new_password') || '').trim();
  const confirmPassword = String(formData.get('confirm_password') || '').trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return data({ error: 'All password fields are required.' }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return data({ error: 'New password and confirmation do not match.' }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return data({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  const customer = await getCustomer(request);

  if (!customer) {
    return data({ error: 'You must be signed in.' }, { status: 401 });
  }

  if (customer.metadata?.email_verified === false) {
    return data({ error: 'Please verify your email before changing your password.' }, { status: 403 });
  }

  let loginResult: unknown;

  try {
    loginResult = await sdk.auth.login('customer', 'emailpass', {
      email: customer.email,
      password: currentPassword,
    });
  } catch (error) {
    return data({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  if (typeof loginResult !== 'string') {
    return data({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  const updateResponse = await fetch(new URL('/auth/customer/emailpass/update', baseMedusaConfig.baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${loginResult}`,
      'x-publishable-api-key': baseMedusaConfig.publishableKey ?? '',
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!updateResponse.ok) {
    return data({ error: 'Unable to update password.' }, { status: updateResponse.status });
  }

  const storefrontUrl = getStorefrontUrl(request);

  try {
    await fetch(new URL('/store/account/password-changed', baseMedusaConfig.baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-publishable-api-key': baseMedusaConfig.publishableKey ?? '',
      },
      body: JSON.stringify({
        email: customer.email,
        contactUrl: `${storefrontUrl}/support`,
      }),
    });
  } catch (error) {
    console.error('Failed to send password changed email', error);
  }

  const headers = new Headers();
  await setAuthToken(headers, loginResult);

  return data({ success: true }, { headers });
};
