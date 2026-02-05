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
          <Tab.Panels>
            {activePaymentOptions.map((paymentOption) => {
              const PaymentComponent = paymentOption.component;
              const paymentMethodToggle =
                activePaymentOptions.length > 1 ? (
                  <Tab.List className="inline-flex rounded-full border border-primary-200/20 bg-primary-950/40 p-1">
                    {activePaymentOptions.map((option) => (
                      <Tab
                        as={Button}
                        key={option.id}
                        className={({ selected }) =>
                          clsx(
                            '!rounded-full !border-0 !shadow-none !ring-0 !px-5 !py-2 !text-sm !font-semibold !leading-none',
                            {
                              '!bg-primary-50 !text-primary-900 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.7)]':
                                selected,
                              '!bg-transparent !text-primary-200 hover:!text-primary-50 hover:!bg-primary-900/30':
                                !selected,
                            },
                          )
                        }
                      >
                        {option.label}
                      </Tab>
                    ))}
                  </Tab.List>
                ) : null;

              return (
                <Tab.Panel key={paymentOption.id}>
                  <PaymentComponent
                    isActiveStep={isActiveStep}
                    providerId={paymentOption.id}
                    paymentMethodToggle={paymentMethodToggle}
                  />
                </Tab.Panel>
              );
            })}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};
