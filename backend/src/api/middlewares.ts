import { authenticate, type MiddlewaresConfig } from '@medusajs/framework/http';

export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: '/store/orders/:id/variant-batches',
      methods: ['GET'],
      middlewares: [authenticate('customer', ['bearer', 'session'])],
    },
  ],
};
