import { baseMedusaConfig } from '@libs/util/server/client.server';
import { data } from 'react-router';

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim();

  if (!email) {
    return data({ error: 'Email is required.' }, { status: 400 });
  }

  const response = await fetch(
    new URL('/auth/customer/emailpass/reset-password', baseMedusaConfig.baseUrl),
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-publishable-api-key': baseMedusaConfig.publishableKey ?? '',
      },
      body: JSON.stringify({
        identifier: email,
        metadata: { email },
      }),
    },
  );

  if (!response.ok) {
    return data({ error: 'Unable to send password reset email.' }, { status: response.status });
  }

  return data({ success: true });
};
