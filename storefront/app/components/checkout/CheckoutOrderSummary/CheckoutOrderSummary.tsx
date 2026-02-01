import { useCheckout } from '@app/hooks/useCheckout';
import { PromotionDTO, StoreCart } from '@medusajs/types';
import { FC, ReactNode } from 'react';
import { CheckoutOrderSummaryItems } from './CheckoutOrderSummaryItems';
import { CheckoutOrderSummaryTotals } from './CheckoutOrderSummaryTotals';

export interface CheckoutOrderSummaryProps {
  submitButton?: ReactNode;
  name: string;
}

export const CheckoutOrderSummary: FC<CheckoutOrderSummaryProps> = ({ submitButton, name }) => {
  const { shippingOptions, cart } = useCheckout();

  if (!cart) return null;

  return (
    <div className="my-0 rounded-lg border border-primary-900/40 bg-highlight-100 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
      <h3 className="sr-only">Items in your cart</h3>
      <CheckoutOrderSummaryItems cart={cart} name={name} />
      <CheckoutOrderSummaryTotals
        cart={cart as StoreCart & { promotions: PromotionDTO[] }}
        shippingOptions={shippingOptions}
      />
      {submitButton && <div className="border-t border-gray-200 p-4 sm:p-6">{submitButton}</div>}
    </div>
  );
};
