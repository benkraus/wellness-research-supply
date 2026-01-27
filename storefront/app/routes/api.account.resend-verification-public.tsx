import { baseMedusaConfig, getPublishableKey } from '@libs/util/server/client.server';
import { config } from '@libs/util/server/config.server';
import { data } from 'react-router';

const getStorefrontUrl = (request: Request) => {
  return config.STOREFRONT_URL ?? new URL(request.url).origin;
};

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();

  if (!email) {
    return data({ error: 'Email is required.' }, { status: 400 });
  }

  const storefrontUrl = getStorefrontUrl(request);

  const publishableKey = (await getPublishableKey()) ?? '';

  const response = await fetch(new URL('/store/account/resend-verification', baseMedusaConfig.baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-publishable-api-key': publishableKey,
    },
    body: JSON.stringify({ email, storefrontUrl }),
  });

  if (!response.ok) {
    return data({ error: 'Unable to send verification email.' }, { status: response.status });
  }

  return data({ success: true });
};
