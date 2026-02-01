import { StoreCartShippingOption } from '@medusajs/types';

export const getShippingOptionAmount = (shippingOption: StoreCartShippingOption) => {
  if (shippingOption.price_type === 'calculated') {
    const calculated = shippingOption.calculated_price?.calculated_amount;
    if (typeof calculated === 'number') return calculated;
  }

  return shippingOption.amount ?? 0;
};

export const getShippingOptionTimeline = (shippingOption: StoreCartShippingOption) => {
  const data = (shippingOption.data && typeof shippingOption.data === 'object') ? shippingOption.data : null;
  const timeline = data ? (data as Record<string, unknown>).delivery_timeline : null;
  const timelineObj = timeline && typeof timeline === 'object' ? (timeline as Record<string, unknown>) : null;
  const direct = typeof timeline === 'string' ? timeline.trim() : '';

  if (direct) return direct;

  const carrierDeliveryDays = timelineObj?.carrier_delivery_days;
  if (typeof carrierDeliveryDays === 'string' && carrierDeliveryDays.trim()) {
    return carrierDeliveryDays.trim();
  }

  const deliveryDays = timelineObj?.delivery_days;
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
