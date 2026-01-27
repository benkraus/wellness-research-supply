import { baseMedusaConfig, getPublishableKey } from '@libs/util/server/client.server';
import { data } from 'react-router';

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim();
  const token = String(formData.get('token') || '').trim();

  if (!email || !token) {
    return data({ error: 'Email and token are required.' }, { status: 400 });
  }

  const publishableKey = (await getPublishableKey()) ?? '';

  const response = await fetch(new URL('/store/account/verify-email', baseMedusaConfig.baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-publishable-api-key': publishableKey,
    },
    body: JSON.stringify({ email, token }),
  });

  if (!response.ok) {
    return data({ error: 'Unable to verify email.' }, { status: response.status });
  }

  return data({ success: true });
};
