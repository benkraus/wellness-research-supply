import { setAuthToken } from '@libs/util/server/cookies.server';
import { sdk } from '@libs/util/server/client.server';
import { data } from 'react-router';

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    return data({ error: 'Email and password are required.' }, { status: 400 });
  }

  const result = await sdk.auth.login('customer', 'emailpass', { email, password });

  if (typeof result !== 'string') {
    return data({ error: 'Additional authentication required.' }, { status: 400 });
  }

  const headers = new Headers();
  await setAuthToken(headers, result);

  return data({ success: true }, { headers });
};
