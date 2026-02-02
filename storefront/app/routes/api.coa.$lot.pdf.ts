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
  const response = await fetch(url.toString(), {
    redirect: 'follow',
    headers: {
      ...(config.MEDUSA_PUBLISHABLE_KEY
        ? { 'x-publishable-api-key': config.MEDUSA_PUBLISHABLE_KEY }
        : {}),
      accept: 'application/pdf,application/json;q=0.9,*/*;q=0.8',
    },
  });

  const buffer = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.set('content-type', headers.get('content-type') || 'application/pdf');

  return new Response(buffer, {
    status: response.status,
    headers,
  });
};
