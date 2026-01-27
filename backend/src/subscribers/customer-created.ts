import type { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'

export default async function customerCreatedHandler({
  _: SubscriberArgs<{ id: string }>
) {
  return
}

export const config: SubscriberConfig = {
  event: 'customer.created',
}
