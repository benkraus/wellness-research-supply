import { config } from '@libs/util/server/config.server';
import type { LoaderFunctionArgs } from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const lot = params.lot?.trim();

  if (!lot) {
    return new Response('Lot number is required.', { status: 400 });
  }

  if (!config.PUBLIC_MEDUSA_API_URL) {
    return new Response('Medusa API URL is not configured.', { status: 500 });
  }

  const url = new URL(`/store/coa/${encodeURIComponent(lot)}`, config.PUBLIC_MEDUSA_API_URL);
  const response = await fetch(url.toString(), { redirect: 'manual' });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');

    if (location) {
      return new Response(null, {
        status: response.status,
        headers: {
          Location: location,
        },
      });
    }
  }

  return response;
};
