import { randomUUID } from 'node:crypto';
import { baseMedusaConfig, getPublishableKey } from '@libs/util/server/client.server';
import { config } from '@libs/util/server/config.server';
import { getCustomer, updateCustomer } from '@libs/util/server/data/customer.server';
import { data } from 'react-router';

const getStorefrontUrl = (request: Request) => {
  return config.STOREFRONT_URL ?? new URL(request.url).origin;
};

export const action = async ({ request }: { request: Request }) => {
  const customer = await getCustomer(request);

  if (!customer) {
    return data({ error: 'You must be signed in.' }, { status: 401 });
  }

  if (customer.metadata?.email_verified === true) {
    return data({ error: 'Your email is already verified.' }, { status: 400 });
  }

  const lastSentAt = customer.metadata?.email_verification_last_sent_at as string | undefined;
  if (lastSentAt) {
    const lastSentTime = Date.parse(lastSentAt);
    if (!Number.isNaN(lastSentTime) && Date.now() - lastSentTime < 60_000) {
      return data({ error: 'Please wait a minute before resending the verification email.' }, { status: 429 });
    }
  }

  const verificationToken = randomUUID();
  const verificationTimestamp = new Date().toISOString();
  const storefrontUrl = getStorefrontUrl(request);
  const verificationUrl = new URL('/account/verify-email', storefrontUrl);
  verificationUrl.searchParams.set('token', verificationToken);
  verificationUrl.searchParams.set('email', customer.email);

  try {
    const publishableKey = (await getPublishableKey()) ?? '';
    await updateCustomer(request, {
      metadata: {
        ...(customer.metadata ?? {}),
        email_verification_token: verificationToken,
        email_verified: false,
        email_verification_token_created_at: verificationTimestamp,
        email_verification_last_sent_at: verificationTimestamp,
      },
    });

    const response = await fetch(new URL('/store/account/email-verification', baseMedusaConfig.baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-publishable-api-key': publishableKey,
      },
      body: JSON.stringify({
        email: customer.email,
        token: verificationToken,
        verificationLink: verificationUrl.toString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Verification email send failed.');
    }
  } catch (error) {
    return data({ error: 'Failed to send verification email.' }, { status: 400 });
  }

  return data({ success: true });
};
