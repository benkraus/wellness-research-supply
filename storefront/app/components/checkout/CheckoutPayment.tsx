import { Button } from '@app/components/common/buttons/Button';
import { useCheckout } from '@app/hooks/useCheckout';
import { CheckoutStep } from '@app/providers/checkout-provider';
import { Tab } from '@headlessui/react';
import clsx from 'clsx';
import { useMemo } from 'react';
import { EdebitPayment } from './EdebitPayment/EdebitPayment';
import { VenmoPayment } from './VenmoPayment/VenmoPayment';

export const CheckoutPayment = () => {
  const { step, paymentProviders, cart } = useCheckout();
  const isActiveStep = step === CheckoutStep.PAYMENT;

  const activePaymentOptions = useMemo(
    () =>
      (paymentProviders ?? [])
        .filter((provider) => {
          const isVenmo = provider.id.includes('venmo');
          const isEdebit = provider.id.includes('edebit');
          return isVenmo || isEdebit;
        })
        .map((provider) => {
          const isVenmo = provider.id.includes('venmo');

          return {
            id: provider.id,
            label: isVenmo ? 'Venmo' : 'eDebit (ACH)',
            component: isVenmo ? VenmoPayment : EdebitPayment,
          };
        }),
    [paymentProviders],
  );

  if (!cart) return null;

  if (activePaymentOptions.length === 0) {
    return (
      <div className="checkout-payment">
        <p className="text-sm text-gray-600">
          No supported payment methods are available. We accept Venmo and eDebit (ACH) only. Reach us at
          hello@wellnessresearchsupply.com for help.
        </p>
      </div>
    );
  }

  return (
    <div className="checkout-payment">
      <div className={clsx({ 'h-0 overflow-hidden opacity-0': !isActiveStep })}>
        <Tab.Group>
          {activePaymentOptions.length > 1 && (
            <Tab.List className="bg-primary-50 mb-2 mt-6 inline-flex gap-0.5 rounded-full p-2">
              {activePaymentOptions.map((paymentOption) => (
                <Tab
                  as={Button}
                  key={paymentOption.id}
                  className={({ selected }) =>
                    clsx('!rounded-full', {
                      '!bg-white !text-gray-700 shadow-sm': selected,
                      '!bg-primary-50 !border-primary-100 !text-primary-600 hover:!text-primary-800 hover:!bg-primary-100 !border-none':
                        !selected,
                    })
                  }
                >
                  {paymentOption.label}
                </Tab>
              ))}
            </Tab.List>
          )}

          <Tab.Panels>
            {activePaymentOptions.map((paymentOption) => {
              const PaymentComponent = paymentOption.component;

              return (
                <Tab.Panel key={paymentOption.id}>
                  <PaymentComponent isActiveStep={isActiveStep} providerId={paymentOption.id} />
                </Tab.Panel>
              );
            })}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};
