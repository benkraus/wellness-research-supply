### local setup
Video instructions: https://youtu.be/PPxenu7IjGM

- `cd /backend`
- `pnpm install` or `npm i`
- Rename `.env.template` ->  `.env`
- To connect to your online database from your local machine, copy the `DATABASE_URL` value auto-generated on Railway and add it to your `.env` file.
  - If connecting to a new database, for example a local one, run `pnpm ib` or `npm run ib` to seed the database.
- `pnpm dev` or `npm run dev`

### requirements
- **postgres database** (Automatic setup when using the Railway template)
- **redis** (Automatic setup when using the Railway template) - fallback to simulated redis.
- **MinIO storage** (Automatic setup when using the Railway template) - fallback to local storage.
- **Meilisearch** (Automatic setup when using the Railway template)

### venmo payments
The Venmo provider is enabled when the required env vars are present. You can run Venmo alongside other providers (e.g. e-check).

Required env vars:

```
VENMO_ACCESS_TOKEN=...
```

Optional env vars:

```
VENMO_SESSION_ID=...
VENMO_DEVICE_ID=...
VENMO_COOKIE=...
VENMO_USER_AGENT=Venmo/10.80.0 (iPhone; iOS 26.2; Scale/3.0)
VENMO_ACCEPT_LANGUAGE=en-US;q=1.0
VENMO_AUDIENCE=public
VENMO_TARGET_PHONE=15555551234
VENMO_TARGET_EMAIL=...
VENMO_TARGET_USER_ID=...
VENMO_ACTOR_ID=...
VENMO_NOTE_TEMPLATE=Order {session_id}
ORDERS_NOTIFICATION_EMAIL=...
VENMO_POLL_ENABLED=true
VENMO_POLL_BASE_SECONDS=30
VENMO_POLL_MAX_SECONDS=1800
VENMO_POLL_MAX_ATTEMPTS=12
VENMO_POLL_MAX_DAYS=3
```

### eDebit payments
The eDebit provider is enabled when the required env vars are present. It uses the Green.Money eDebit API (OneTimeDraftRTV by default).

Required env vars:

```
EDEBIT_CLIENT_ID=...
EDEBIT_API_PASSWORD=...
EDEBIT_ENCRYPTION_KEY=...
```

Optional env vars:

```
EDEBIT_ENDPOINT=https://www.greenbyphone.com/eCheck.asmx
EDEBIT_VERIFICATION_MODE=rtv
EDEBIT_CHECK_MEMO_TEMPLATE=Order {session_id}
EDEBIT_STATUS_CHECK_ENABLED=true
```

Per-order eDebit details:
- The storefront collects the buyer's bank details (account holder name, routing number, account number, bank name, phone) and stores them on the payment session data.
- The provider submits a one-time draft to eDebit and stores the resulting Check_ID on the payment session.

### telegram order notifications
Send a Telegram message when a new order is placed.

Required env vars:

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Optional env vars:

```
TELEGRAM_ORDER_NOTIFICATIONS_ENABLED=true
```

Per-order Venmo destination:
- The storefront collects the buyer's Venmo phone or email and stores it on the payment session data.
- The provider uses that per-session target first, and falls back to `VENMO_TARGET_*` if provided.

#### Region payment provider config
Venmo only shows up at checkout if the region includes the Venmo provider ID.

eDebit only shows up at checkout if the region includes the eDebit provider ID.

Option A (Admin UI):
- Admin → Settings → Regions → Edit Region → Payment Providers → enable **Venmo**

Option B (seed data):
- Add `"pp_venmo_venmo"` to the region’s `payment_providers` in `backend/src/scripts/seed.ts`.
- Add `"pp_edebit_edebit"` to the same list if you want eDebit enabled by default.
- Example:

```
payment_providers: ["pp_system_default", "pp_venmo_venmo", "pp_edebit_edebit"],
```

If you add another provider (e-check, Stripe, etc.), include its provider ID in the same list so multiple options appear at checkout.

### commands

`cd backend/`
`npm run ib` or `pnpm ib` will initialize the backend by running migrations and seed the database with required system data.
`npm run dev` or `pnpm dev` will start the backend (and admin dashboard frontend on `localhost:9000/app`) in development mode.
`pnpm build && pnpm start` will compile the project and run from compiled source. This can be useful for reproducing issues on your cloud instance.

### ShipStation integration

This backend includes a ShipStation fulfillment + shipping provider that is already registered in `backend/medusa-config.js`. Setting the `SHIPSTATION_API_KEY` environment variable enables the provider at runtime.

#### setup
- Add `SHIPSTATION_API_KEY` to your backend `.env` file.
- In Medusa Admin, create shipping options that use Calculated pricing so ShipStation can return live rates.
- Ensure your stock location has a complete address; ShipStation uses it as the origin for rate and label requests.

#### storefront behavior
- Checkout calls Medusa to list shipping methods, then displays the calculated prices from `option.amount` automatically.

#### fulfillment behavior
- A ShipStation shipment is created when a shipping method is set on the order.
- A label is purchased when a fulfillment is created.
- Labels are not purchased at order placement unless you add a custom workflow to do so.

#### package sizing logic
- Packages are capped at 10 vials per package.
- Each package uses a fixed size of 6x4x1 inches and a fixed weight of 4 oz.
- Orders with more than 10 vials are split into multiple packages using the same fixed dimensions.

#### implementation notes
- Edit the ShipStation logic in `backend/src/modules/shipstation/service.ts`.
