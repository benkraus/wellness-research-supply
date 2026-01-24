// https://github.com/remix-run/remix/issues/2947

import * as Sentry from '@sentry/remix';
import posthog from 'posthog-js';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

declare global {
  interface Window {
    ENV: any;
    posthog?: typeof posthog;
  }
}

if (window?.ENV?.SENTRY_DSN)
  Sentry.init({
    dsn: window?.ENV?.SENTRY_DSN,
    environment: window?.ENV?.SENTRY_ENVIRONMENT,
    integrations: [],
  });

if (window?.ENV?.PUBLIC_POSTHOG_KEY) {
  const posthogHost = window?.ENV?.PUBLIC_POSTHOG_HOST;
  posthog.init(window.ENV.PUBLIC_POSTHOG_KEY, {
    api_host: posthogHost || undefined,
    capture_pageview: false,
  });
  window.posthog = posthog;
}

const hydrate = () =>
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1);
}
