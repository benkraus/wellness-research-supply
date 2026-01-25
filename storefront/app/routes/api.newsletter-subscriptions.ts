import { zodResolver } from '@hookform/resolvers/zod';
import { ActionFunctionArgs, data } from 'react-router';
import { getValidatedFormData } from 'remix-hook-form';
import { z } from 'zod';

export const newsletterSubscriberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const KLAVIYO_LIST_ID = 'SyBEGf';
const KLAVIYO_REVISION = '2025-04-15';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { data: validatedData, errors } = await getValidatedFormData(
    await request.formData(),
    zodResolver(newsletterSubscriberSchema),
  );

  if (errors) {
    return data({ errors }, { status: 400 });
  }

  const { email } = validatedData;

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY ?? process.env.KLAVIYO_API_KEY;

  if (!apiKey) {
    console.error('Klaviyo API key missing for newsletter subscriptions');
    return data({ error: 'Newsletter signup is unavailable right now.' }, { status: 500 });
  }

  const response = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify({
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: {
                  email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: 'SUBSCRIBED',
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: {
            data: {
              type: 'list',
              id: KLAVIYO_LIST_ID,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    console.error('Klaviyo subscription failed', {
      status: response.status,
      body: responseText,
    });
    return data({ error: 'Unable to subscribe right now.' }, { status: 502 });
  }

  return data({ success: true }, { status: 200 });
};
