// biome-ignore assist/source/organizeImports: keep import order aligned with other backend files
import { authenticate } from '@medusajs/framework/http';
import type {
  MiddlewaresConfig,
  MedusaNextFunction,
  MedusaStoreRequest,
} from '@medusajs/framework/http';

// Middleware that allows /store/coa/:lot to bypass publishable key requirement
function allowPublicCoa(req: MedusaStoreRequest, next: MedusaNextFunction) {
  // Set a flag to indicate this route should skip publishable key validation
  req.publishable_key_context = {
    key: 'public',
    sales_channel_ids: [],
  };
  return next();
}

export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: '/store/coa/:lot',
      methods: ['GET'],
      middlewares: [allowPublicCoa],
    },
    {
      matcher: '/store/orders/:id/variant-batches',
      methods: ['GET'],
      middlewares: [authenticate('customer', ['bearer', 'session'])],
    },
    {
      matcher: '/store/orders/tracking',
      methods: ['GET'],
      middlewares: [authenticate('customer', ['bearer', 'session'])],
    },
  ],
};
