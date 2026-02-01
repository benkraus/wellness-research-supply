import { StoreCartShippingOption } from '@medusajs/types';

export const getShippingOptionAmount = (shippingOption: StoreCartShippingOption) => {
  if (shippingOption.price_type === 'calculated') {
    const calculated = shippingOption.calculated_price?.calculated_amount;
    if (typeof calculated === 'number') return calculated;
  }

  return shippingOption.amount ?? 0;
};

const getCalculatedPriceMetadata = (shippingOption: StoreCartShippingOption) => {
  const calculatedPrice = shippingOption.calculated_price;
  if (!calculatedPrice || typeof calculatedPrice !== 'object') return undefined;

  const metadata = (calculatedPrice as Record<string, unknown>).metadata;
  if (!metadata || typeof metadata !== 'object') return undefined;

  return metadata as Record<string, unknown>;
};

export const getShippingOptionTimeline = (shippingOption: StoreCartShippingOption) => {
  const metadata = getCalculatedPriceMetadata(shippingOption);
  if (!metadata) return null;

  const carrierDeliveryDays = metadata.carrier_delivery_days;
  if (typeof carrierDeliveryDays === 'string' && carrierDeliveryDays.trim()) {
    return carrierDeliveryDays.trim();
  }

  const deliveryDays = metadata.delivery_days;
  if (typeof deliveryDays === 'number' && !Number.isNaN(deliveryDays)) {
    return `${deliveryDays}`;
  }

  return null;
};

export const getShippingOptionsByProfile = (shippingOptions: StoreCartShippingOption[]) => {
  const shippingOptionsByProfile = shippingOptions.reduce<Record<string, StoreCartShippingOption[]>>(
    (acc, shippingOption) => {
      const profileId = shippingOption.shipping_profile_id;

      if (!profileId) return acc;

      if (!acc[profileId]) acc[profileId] = [];

      acc[profileId].push(shippingOption);

      return acc;
    },
    {},
  );

  Object.keys(shippingOptionsByProfile).forEach((profileId) => {
    shippingOptionsByProfile[profileId].sort((a, b) => getShippingOptionAmount(a) - getShippingOptionAmount(b));
  });

  return shippingOptionsByProfile;
};
