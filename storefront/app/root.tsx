import { getCommonMeta, mergeMeta } from '@libs/util/meta';
import { getRootLoader } from '@libs/util/server/root.server';
import { useEffect, useRef } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  ShouldRevalidateFunction,
  useLoaderData,
  useLocation,
  useRouteError,
} from 'react-router';
import { MetaFunction } from 'react-router';
import { Page } from './components/layout/Page';
import { RootProviders } from './providers/root-providers';
import { getPosthog } from './lib/posthog';

import '@app/styles/global.css';
import { useRootLoaderData } from './hooks/useRootLoaderData';

export const getRootMeta: MetaFunction = ({ data }) => {
  const title = 'Wellness Research Supply';
  const description = 'Premium research supply for wellness and longevity. Clinical clarity, aquatic atmosphere.';
  const ogTitle = title;
  const ogDescription = description;
  const ogImage = '';
  const ogImageAlt = !!ogImage ? `${ogTitle} logo` : undefined;

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: ogTitle },
    { property: 'og:description', content: ogDescription },
    { property: 'og:image', content: ogImage },
    { property: 'og:image:alt', content: ogImageAlt },
  ];
};

export const meta: MetaFunction<typeof loader> = mergeMeta(getCommonMeta, getRootMeta);

export const loader = getRootLoader;

export const shouldRevalidate: ShouldRevalidateFunction = ({
  actionResult,
  currentParams,
  currentUrl,
  defaultShouldRevalidate,
  formAction,
  formData,
  formEncType,
  formMethod,
  nextParams,
  nextUrl,
}) => {
  if (nextUrl.pathname.startsWith('/checkout/success')) return true;
  if (!formMethod || formMethod === 'GET') return false;

  return defaultShouldRevalidate;
};

function App() {
  const headRef = useRef<HTMLHeadElement>(null);
  const lastIdentifiedRef = useRef<string | null>(null);
  const data = useRootLoaderData();
  const location = useLocation();

  const { env = {}, siteDetails, customer } = data || {};

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const posthog = getPosthog();
    if (!posthog) return;
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const posthog = getPosthog();
    if (!posthog) return;

    if (customer?.id) {
      if (lastIdentifiedRef.current === customer.id) return;

      const personProperties: Record<string, unknown> = {};
      if (customer.email) personProperties.email = customer.email;
      if (customer.first_name) personProperties.first_name = customer.first_name;
      if (customer.last_name) personProperties.last_name = customer.last_name;
      if (customer.phone) personProperties.phone = customer.phone;

      posthog.identify(customer.id, personProperties);
      lastIdentifiedRef.current = customer.id;
      return;
    }

    if (lastIdentifiedRef.current) {
      posthog.reset();
      lastIdentifiedRef.current = null;
    }
  }, [customer?.id, customer?.email, customer?.first_name, customer?.last_name, customer?.phone]);

  return (
    <RootProviders>
      <html lang="en" className="min-h-screen">
        <head ref={headRef}>
          <meta charSet="UTF-8" />
          <Meta />

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <Links />
          {env.KLAVIYO_SITE_ID && (
            <script
              async
              type="text/javascript"
              src={`https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=${env.KLAVIYO_SITE_ID}`}
            />
          )}
          {siteDetails?.settings?.description && <meta name="description" content={siteDetails.settings.description} />}
        </head>
        <body className="min-h-screen">
          <Page>
            <Outlet />
          </Page>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.ENV = ${JSON.stringify(env)}`,
            }}
          />
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    </RootProviders>
  );
}

export default App;

export function ErrorBoundary() {
  const error = useRouteError();

  console.error('error boundary error', error);

  return (
    <html>
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Scripts />
      </body>
    </html>
  );
}
