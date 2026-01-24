import { baseMedusaConfig } from '@libs/util/server/client.server';
import { config } from '@libs/util/server/config.server';
import { data } from 'react-router';

const getStorefrontUrl = (request: Request) => {
  return config.STOREFRONT_URL ?? new URL(request.url).origin;
};

export const action = async ({ request }: { request: Request }) => {
  const MIN_PASSWORD_LENGTH = 10;
  const formData = await request.formData();
  const token = String(formData.get('token') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const email = String(formData.get('email') || '').trim();

  if (!token || !password || !email) {
    return data({ error: 'Token, email, and new password are required.' }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return data({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  const response = await fetch(
    new URL('/auth/customer/emailpass/update', baseMedusaConfig.baseUrl),
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-publishable-api-key': baseMedusaConfig.publishableKey ?? '',
      },
      body: JSON.stringify({ password }),
    },
  );

  if (!response.ok) {
    return data({ error: 'Unable to reset password.' }, { status: response.status });
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
        email,
        contactUrl: `${storefrontUrl}/support`,
      }),
    });
  } catch (error) {
    console.error('Failed to send password changed email', error);
  }

  return data({ success: true });
};
