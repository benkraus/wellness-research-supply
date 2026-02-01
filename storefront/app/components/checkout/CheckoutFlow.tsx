import { Alert } from '@app/components/common/alert/Alert';
import { useCheckout } from '@app/hooks/useCheckout';
import { useCustomer } from '@app/hooks/useCustomer';
import { FC } from 'react';
import { CheckoutAccountDetails } from './CheckoutAccountDetails';
import { CheckoutDeliveryMethod } from './CheckoutDeliveryMethod';
import { CheckoutPayment } from './CheckoutPayment';

export const CheckoutFlow: FC = () => {
  const { customer } = useCustomer();
  const { cart } = useCheckout();
  const isLoggedIn = !!customer?.id;

  if (!cart) return null;

  return (
    <>
      <div className="lg:min-h-[calc(100vh-320px)] lg:pl-8">
        {isLoggedIn && (
          <Alert type="info" tone="dark" className="mb-8">
            Checking out as:{' '}
            <strong className="font-bold">
              {customer.first_name} {customer.last_name} ({customer.email})
            </strong>
          </Alert>
        )}

        <CheckoutAccountDetails />

        <hr className="my-10" />

        <CheckoutDeliveryMethod />

        <CheckoutPayment />
      </div>
    </>
  );
};
