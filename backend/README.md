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
