import { StoreCartShippingOption } from '@medusajs/types';
import { getShippingOptionAmount, getShippingOptionsByProfile } from '../checkout';

export function calculateEstimatedShipping(shippingOptions: StoreCartShippingOption[]): number {
  if (shippingOptions?.length < 1) return 0;

  const shippingOptionsByProfile = getShippingOptionsByProfile(shippingOptions);

  return Object.values(shippingOptionsByProfile).reduce((acc, shippingOptions) => {
    const cheapestOption = shippingOptions.reduce((prev, curr) =>
      getShippingOptionAmount(prev) < getShippingOptionAmount(curr) ? prev : curr,
    );

    return acc + getShippingOptionAmount(cheapestOption);
  }, 0);
}
