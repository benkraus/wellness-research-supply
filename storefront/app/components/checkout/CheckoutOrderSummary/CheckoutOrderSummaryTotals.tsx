import { calculateEstimatedShipping } from '@libs/util/carts';
import { formatPrice } from '@libs/util/prices';
import type { PromotionDTO, StoreCart, StoreCartShippingOption, StoreRegion } from '@medusajs/types';
import clsx from 'clsx';
import type { FC, HTMLAttributes } from 'react';
import { CheckoutOrderSummaryDiscountCode } from './CheckoutOrderSummaryDiscountCode';

export interface CheckoutOrderSummaryTotalsProps extends HTMLAttributes<HTMLDListElement> {
  cart: StoreCart & { promotions: PromotionDTO[] };
  shippingOptions: StoreCartShippingOption[];
}

export interface CheckoutOrderSummaryTotalsItemProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  amount?: number | null;
  region: StoreRegion;
}

const CheckoutOrderSummaryTotalsItem: FC<CheckoutOrderSummaryTotalsItemProps> = ({
  label,
  amount,
  className,
  region,
}) => (
  <div className={clsx('flex items-center justify-between text-sm text-primary-200', className)}>
    <dt>{label}</dt>
    <dd className="font-bold text-primary-50">{formatPrice(amount || 0, { currency: region?.currency_code })}</dd>
  </div>
);

export const CheckoutOrderSummaryTotals: FC<CheckoutOrderSummaryTotalsProps> = ({ shippingOptions, cart }) => {
  const shippingMethods = cart.shipping_methods || [];
  const hasShippingMethod = shippingMethods.length > 0;
  const estimatedShipping = calculateEstimatedShipping(shippingOptions);
  const discountTotal = cart.discount_total ?? 0;
  const shippingAmount = shippingMethods.reduce((acc, method) => acc + (method.amount ?? 0), 0);
  const cartTotal = cart.total ?? 0;
  const total = hasShippingMethod ? cartTotal : cartTotal + estimatedShipping;

  return (
    <div className="border-t border-primary-900/40 px-4 py-6 sm:px-6">
      <CheckoutOrderSummaryDiscountCode cart={cart} />

      <dl className="flex flex-col gap-2">
        <CheckoutOrderSummaryTotalsItem label="Subtotal" amount={cart.item_subtotal} region={cart.region!} />
        {discountTotal > 0 && (
          <CheckoutOrderSummaryTotalsItem label="Discount" amount={-discountTotal} region={cart.region!} />
        )}
        {hasShippingMethod && (
          <CheckoutOrderSummaryTotalsItem label="Shipping" amount={shippingAmount} region={cart.region!} />
        )}
        {!hasShippingMethod && (
          <CheckoutOrderSummaryTotalsItem label="Estimated Shipping" amount={estimatedShipping} region={cart.region!} />
        )}
        <CheckoutOrderSummaryTotalsItem label="Taxes" amount={cart.tax_total} region={cart.region!} />
        <CheckoutOrderSummaryTotalsItem
          label="Total"
          amount={total}
          className="border-t border-primary-900/40 pt-6 !text-xl text-primary-50"
          region={cart.region!}
        />
      </dl>
    </div>
  );
};
