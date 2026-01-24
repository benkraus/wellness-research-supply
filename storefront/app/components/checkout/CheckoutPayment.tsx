import { Button } from '@app/components/common/buttons/Button';
import { useCheckout } from '@app/hooks/useCheckout';
import { CheckoutStep } from '@app/providers/checkout-provider';
import { Tab } from '@headlessui/react';
import clsx from 'clsx';
import { FC, useMemo } from 'react';
import { ManualPayment } from './ManualPayment/ManualPayment';

const SYSTEM_PROVIDER_ID = 'pp_system_default';

export const CheckoutPayment: FC = () => {
  const { step, paymentProviders, cart } = useCheckout();
  const isActiveStep = step === CheckoutStep.PAYMENT;

  if (!cart) return null;

  const activePaymentOptions = useMemo(
    () =>
      (paymentProviders ?? [])
        .filter((provider) => !provider.id.includes('stripe'))
        .map((provider) => ({
          id: provider.id,
          label: provider.id === SYSTEM_PROVIDER_ID ? 'Manual Payment' : provider.name ?? provider.id,
          component: ManualPayment,
        })),
    [paymentProviders],
  );

  if (activePaymentOptions.length === 0) {
    return (
      <div className="checkout-payment">
        <p className="text-sm text-gray-600">
          No supported payment methods are available for this region. Card payments are not accepted. Reach us at
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
              {activePaymentOptions.map((paymentOption, index) => (
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
