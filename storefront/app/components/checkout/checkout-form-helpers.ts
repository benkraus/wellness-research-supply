import { StoreCart, StoreCartAddress, StoreCustomer } from '@medusajs/types';

export const selectInitialShippingAddress = (cart: StoreCart, customer?: StoreCustomer) => {
  if (cart.shipping_address) return cart.shipping_address;

  if (!customer || !customer?.addresses?.length) return null;

  const customerAddress =
    customer.addresses?.find((address) => address.is_default_shipping) ??
    customer?.addresses?.[0];

  return (customerAddress as StoreCartAddress) || null;
};
