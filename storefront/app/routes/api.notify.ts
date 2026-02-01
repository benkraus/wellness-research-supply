import { normalizePhoneNumber } from '@libs/util/phoneNumber';
import { getCustomer } from '@libs/util/server/data/customer.server';
import { data } from 'react-router';

const KLAVIYO_REVISION = '2025-04-15';

const getKlaviyoAuthHeaders = (apiKey: string) => ({
  accept: 'application/json',
  'content-type': 'application/json',
  authorization: `Klaviyo-API-Key ${apiKey}`,
  revision: KLAVIYO_REVISION,
});

const findListByName = async (apiKey: string, listName: string) => {
  const filter = encodeURIComponent(`equals(name,"${listName}")`);
  const response = await fetch(`https://a.klaviyo.com/api/lists?filter=${filter}`, {
    method: 'GET',
    headers: getKlaviyoAuthHeaders(apiKey),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: Array<{ id?: string }> };
  const listId = payload.data?.[0]?.id;
  return listId ?? null;
};

const createList = async (apiKey: string, listName: string) => {
  const response = await fetch('https://a.klaviyo.com/api/lists', {
    method: 'POST',
    headers: getKlaviyoAuthHeaders(apiKey),
    body: JSON.stringify({
      data: {
        type: 'list',
        attributes: {
          name: listName,
        },
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: { id?: string } };
  return payload.data?.id ?? null;
};

const ensureListId = async (apiKey: string, listName: string) => {
  const existing = await findListByName(apiKey, listName);
  if (existing) return existing;
  return await createList(apiKey, listName);
};

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const batchId = String(formData.get('variant_batch_id') || '').trim();

  if (!batchId) {
    return data({ error: 'Batch information is required.' }, { status: 400 });
  }

  const customer = await getCustomer(request);

  if (!customer) {
    return data({ error: 'You must be signed in to get notified.' }, { status: 401 });
  }

  const email = customer.email?.trim() || '';
  const phone = normalizePhoneNumber(customer.phone || '') || '';

  if (!email && !phone) {
    return data({ error: 'Add an email or phone number to your account to get notified.' }, { status: 400 });
  }

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY ?? process.env.KLAVIYO_API_KEY;

  if (!apiKey) {
    console.error('Klaviyo API key missing for notify subscriptions');
    return data({ error: 'Notify is unavailable right now.' }, { status: 500 });
  }

  const listName = `notify-batch-${batchId}`;
  const listId = await ensureListId(apiKey, listName);

  if (!listId) {
    return data({ error: 'Unable to prepare notification list.' }, { status: 502 });
  }

  const sendSubscription = async (payload: {
    email?: string;
    phone?: string;
    subscriptions: Record<string, unknown>;
  }) => {
    return await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
      method: 'POST',
      headers: getKlaviyoAuthHeaders(apiKey),
      body: JSON.stringify({
        data: {
          type: 'profile-subscription-bulk-create-job',
          attributes: {
            profiles: {
              data: [
                {
                  type: 'profile',
                  attributes: {
                    ...(payload.email ? { email: payload.email } : {}),
                    ...(payload.phone ? { phone_number: payload.phone } : {}),
                    ...(Object.keys(payload.subscriptions).length ? { subscriptions: payload.subscriptions } : {}),
                  },
                },
              ],
            },
          },
          relationships: {
            list: {
              data: {
                type: 'list',
                id: listId,
              },
            },
          },
        },
      }),
    });
  };

  const subscriptions: Record<string, unknown> = {};
  if (email) {
    subscriptions.email = { marketing: { consent: 'SUBSCRIBED' } };
  }
  if (phone) {
    subscriptions.sms = { marketing: { consent: 'SUBSCRIBED' } };
  }

  let response = await sendSubscription({ email, phone, subscriptions });

  if (!response.ok && phone && email) {
    const retrySubscriptions: Record<string, unknown> = {
      email: { marketing: { consent: 'SUBSCRIBED' } },
    };
    response = await sendSubscription({ email, subscriptions: retrySubscriptions });
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    console.error('Klaviyo notify subscription failed', {
      status: response.status,
      body: responseText,
    });
    return data({ error: 'Unable to subscribe right now.' }, { status: 502 });
  }

  return data({ success: true }, { status: 200 });
};
