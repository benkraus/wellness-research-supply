import { loadEnv } from '@medusajs/framework/utils'

import { assertValue } from 'utils/assert-value'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

/**
 * Is development environment
 */
export const IS_DEV = process.env.NODE_ENV === 'development'

/**
 * Public URL for the backend
 */
export const BACKEND_URL = process.env.BACKEND_PUBLIC_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN_VALUE ?? 'http://localhost:9000'

/**
 * Database URL for Postgres instance used by the backend
 */
export const DATABASE_URL = assertValue(
  process.env.DATABASE_URL,
  'Environment variable for DATABASE_URL is not set',
)

/**
 * (optional) Redis URL for Redis instance used by the backend
 */
export const REDIS_URL = process.env.REDIS_URL;

/**
 * Admin CORS origins
 */
export const ADMIN_CORS = process.env.ADMIN_CORS;

/**
 * Auth CORS origins
 */
export const AUTH_CORS = process.env.AUTH_CORS;

/**
 * Store/frontend CORS origins
 */
export const STORE_CORS = process.env.STORE_CORS;

/**
 * JWT Secret used for signing JWT tokens
 */
export const JWT_SECRET = assertValue(
  process.env.JWT_SECRET,
  'Environment variable for JWT_SECRET is not set',
)

/**
 * Cookie secret used for signing cookies
 */
export const COOKIE_SECRET = assertValue(
  process.env.COOKIE_SECRET,
  'Environment variable for COOKIE_SECRET is not set',
)

/**
 * (optional) Minio configuration for file storage
 */
export const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
export const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
export const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
export const MINIO_BUCKET = process.env.MINIO_BUCKET; // Optional, if not set bucket will be called: medusa-media

/**
 * (optional) Resend API Key and from Email - do not set if using SendGrid
 */
export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;

/**
 * (optionl) SendGrid API Key and from Email - do not set if using Resend
 */
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
export const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM;

/**
 * Email sender addresses
 */
export const ORDERS_FROM_EMAIL =
  process.env.ORDERS_FROM_EMAIL ?? RESEND_FROM_EMAIL ?? SENDGRID_FROM_EMAIL ?? 'orders@wellnessresearchsupply.com';
export const ACCOUNT_FROM_EMAIL =
  process.env.ACCOUNT_FROM_EMAIL ?? RESEND_FROM_EMAIL ?? SENDGRID_FROM_EMAIL ?? 'hello@wellnessresearchsupply.com';

/**
 * (optional) ShipStation API key
 */
export const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY;

/**
 * (optional) ShipStation webhook secret
 */
export const SHIPSTATION_WEBHOOK_SECRET = process.env.SHIPSTATION_WEBHOOK_SECRET;

/**
 * (optional) Klaviyo configuration
 */
export const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
export const KLAVIYO_SITE_ID = process.env.KLAVIYO_SITE_ID;

/**
 * (optional) Orders notification email
 */
export const ORDERS_NOTIFICATION_EMAIL = process.env.ORDERS_NOTIFICATION_EMAIL;

/**
 * (optional) Telegram order notifications
 */
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
export const TELEGRAM_ORDER_NOTIFICATIONS_ENABLED =
  process.env.TELEGRAM_ORDER_NOTIFICATIONS_ENABLED === undefined
    ? true
    : process.env.TELEGRAM_ORDER_NOTIFICATIONS_ENABLED === "true";

/**
 * (optional) Venmo configuration
 */
export const VENMO_ACCESS_TOKEN = process.env.VENMO_ACCESS_TOKEN;
export const VENMO_SESSION_ID = process.env.VENMO_SESSION_ID;
export const VENMO_DEVICE_ID = process.env.VENMO_DEVICE_ID;
export const VENMO_COOKIE = process.env.VENMO_COOKIE;
export const VENMO_USER_AGENT = process.env.VENMO_USER_AGENT;
export const VENMO_ACCEPT_LANGUAGE = process.env.VENMO_ACCEPT_LANGUAGE;
export const VENMO_AUDIENCE = process.env.VENMO_AUDIENCE;
export const VENMO_TARGET_PHONE = process.env.VENMO_TARGET_PHONE;
export const VENMO_TARGET_EMAIL = process.env.VENMO_TARGET_EMAIL;
export const VENMO_TARGET_USER_ID = process.env.VENMO_TARGET_USER_ID;
export const VENMO_ACTOR_ID = process.env.VENMO_ACTOR_ID;
export const VENMO_NOTE_TEMPLATE = process.env.VENMO_NOTE_TEMPLATE;
export const VENMO_POLL_ENABLED =
  process.env.VENMO_POLL_ENABLED === undefined
    ? true
    : process.env.VENMO_POLL_ENABLED === "true";
export const VENMO_POLL_BASE_SECONDS = Number(
  process.env.VENMO_POLL_BASE_SECONDS ?? 30
);
export const VENMO_POLL_MAX_SECONDS = Number(
  process.env.VENMO_POLL_MAX_SECONDS ?? 1800
);
export const VENMO_POLL_MAX_ATTEMPTS = Number(
  process.env.VENMO_POLL_MAX_ATTEMPTS ?? 12
);
export const VENMO_POLL_MAX_DAYS = Number(
  process.env.VENMO_POLL_MAX_DAYS ?? 3
);

export const VENMO_POLL_BASE_SECONDS_SAFE = Number.isFinite(
  VENMO_POLL_BASE_SECONDS
)
  ? VENMO_POLL_BASE_SECONDS
  : 30
export const VENMO_POLL_MAX_SECONDS_SAFE = Number.isFinite(
  VENMO_POLL_MAX_SECONDS
)
  ? VENMO_POLL_MAX_SECONDS
  : 1800
export const VENMO_POLL_MAX_ATTEMPTS_SAFE = Number.isFinite(
  VENMO_POLL_MAX_ATTEMPTS
)
  ? VENMO_POLL_MAX_ATTEMPTS
  : 12
export const VENMO_POLL_MAX_DAYS_SAFE = Number.isFinite(VENMO_POLL_MAX_DAYS)
  ? VENMO_POLL_MAX_DAYS
  : 3

/**
 * (optional) eDebit configuration
 */
export const EDEBIT_CLIENT_ID = process.env.EDEBIT_CLIENT_ID;
export const EDEBIT_API_PASSWORD = process.env.EDEBIT_API_PASSWORD;
export const EDEBIT_ENDPOINT = process.env.EDEBIT_ENDPOINT;
export const EDEBIT_VERIFICATION_MODE = process.env.EDEBIT_VERIFICATION_MODE as
  | "rtv"
  | "bv"
  | undefined;
export const EDEBIT_CHECK_MEMO_TEMPLATE = process.env.EDEBIT_CHECK_MEMO_TEMPLATE;
export const EDEBIT_STATUS_CHECK_ENABLED =
  process.env.EDEBIT_STATUS_CHECK_ENABLED === undefined
    ? undefined
    : process.env.EDEBIT_STATUS_CHECK_ENABLED === "true";
export const EDEBIT_ENCRYPTION_KEY = process.env.EDEBIT_ENCRYPTION_KEY;

/**
 * (optional) Meilisearch configuration
 */
export const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST;
export const MEILISEARCH_ADMIN_KEY = process.env.MEILISEARCH_ADMIN_KEY;

/**
 * Worker mode
 */
export const WORKER_MODE =
  (process.env.MEDUSA_WORKER_MODE as 'worker' | 'server' | 'shared' | undefined) ?? 'shared'

/**
 * Disable Admin
 */
export const SHOULD_DISABLE_ADMIN = process.env.MEDUSA_DISABLE_ADMIN === 'true'
