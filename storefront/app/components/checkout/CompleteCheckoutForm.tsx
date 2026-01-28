import { SubmitButton } from '@app/components/common/remix-hook-form/buttons/SubmitButton';
import { useCheckout } from '@app/hooks/useCheckout';
import { useCustomer } from '@app/hooks/useCustomer';
import { CompleteCheckoutFormData, completeCheckoutSchema } from '@app/routes/api.checkout.complete';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, TextField } from '@lambdacurry/forms/remix-hook-form';
import { type MedusaAddress } from '@libs/types';
import { medusaAddressToAddress } from '@libs/util';
import { FetcherKeys } from '@libs/util/fetcher-keys';
import { FC, FormEvent, PropsWithChildren, useState } from 'react';
import { SubmitFunction, useFetcher } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';
import { CheckoutOrderSummary } from '.';
import { FormError } from '../common/remix-hook-form/forms/FormError';
import { AddressDisplay } from './address/AddressDisplay';
import { AddressFormFields } from './address/AddressFormFields';

export interface CompleteCheckoutFormProps extends PropsWithChildren {
  id: string;
  providerId: string;
  submitMessage?: string;
  className?: string;
  onSubmit?: (
    data: CompleteCheckoutFormData,
    event: FormEvent<HTMLFormElement>,
    methods: {
      setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
      submit: SubmitFunction;
    },
  ) => Promise<void>;
}

export const CompleteCheckoutForm: FC<CompleteCheckoutFormProps> = ({
  id,
  submitMessage,
  onSubmit,
  children,
  providerId,
  className,
}) => {
  const { activePaymentSession, cart, isCartMutating } = useCheckout();
  const { customer } = useCustomer();

  const completeCartFetcher = useFetcher<never>({ key: FetcherKeys.cart.completeCheckout });

  const [submitting, setSubmitting] = useState(false);
  const NEW_BILLING_ADDRESS_ID = 'new';
  const [billingAddressId, setBillingAddressId] = useState(NEW_BILLING_ADDRESS_ID);

  const isSubmitting = ['submitting', 'loading'].includes(completeCartFetcher.state) || submitting;

  if (!cart) return null;

  const defaultBillingAddress = medusaAddressToAddress(cart.billing_address as MedusaAddress);
  const shippingAddress = medusaAddressToAddress(cart?.shipping_address as MedusaAddress);

  const countryOptions =
    (cart.region?.countries?.map((country) => ({
      value: country.iso_2,
      label: country.display_name,
    })) as { value: string; label: string }[]) ?? [];

  const billingAddressOptions = (customer?.addresses ?? []).map((address) => {
    const label = [
      address.address_1,
      address.city,
      address.province,
      address.postal_code,
      address.country_code?.toUpperCase(),
    ]
      .filter(Boolean)
      .join(', ');

    return {
      id: address.id,
      label,
      address: medusaAddressToAddress(address as MedusaAddress),
    };
  });

  const defaultValues: CompleteCheckoutFormData = {
    cartId: cart.id,
    sameAsShipping: true,
    billingAddress: defaultBillingAddress,
    providerId,
    venmoContact: '',
    edebitAccountName: '',
    edebitRoutingNumber: '',
    edebitAccountNumber: '',
    edebitBankName: '',
    edebitPhone: '',
    edebitSavedMethodId: '',
    edebitSaveMethod: false,
  };

  const form = useRemixForm({
    resolver: zodResolver(completeCheckoutSchema),
    defaultValues,
    fetcher: completeCartFetcher,
    submitConfig: {
      method: 'post',
      action: '/api/checkout/complete',
    },
  });

  const sameAsShipping = form.watch('sameAsShipping');
  const billingAddress = form.watch('billingAddress');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);

    const data = form.getValues();

    if (typeof onSubmit === 'function') {
      return await onSubmit(data, event, {
        setSubmitting,
        submit: () => form.handleSubmit(),
      });
    }

    try {
      return await form.handleSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  const PaymentSubmitButton = () => (
    <SubmitButton
      form={id}
      className="w-full lg:w-auto"
      disabled={isSubmitting || isCartMutating || (!sameAsShipping && !billingAddress)}
    >
      {isSubmitting ? 'Confirming...' : (submitMessage ?? 'Place order')}
    </SubmitButton>
  );

  if (!activePaymentSession) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-900">
        <p className="text-sm font-semibold">Payment session unavailable</p>
        <p className="mt-1 text-sm">
          We couldn’t start your payment session. Please refresh the page or contact
          hello@wellnessresearchsupply.com for help.
        </p>
      </div>
    );
  }

  return (
    <>
      <RemixFormProvider {...form}>
        <completeCartFetcher.Form id={id} onSubmit={handleSubmit} className={className}>
          <TextField type="hidden" name="cartId" value={cart.id} />
          <TextField type="hidden" name="providerId" value={providerId} />

          <h3 className="text-lg font-bold text-gray-900">Billing address</h3>

          <Checkbox className="my-4" name="sameAsShipping" label="Same as shipping address" />

          {!sameAsShipping && (
            <>
              {billingAddressOptions.length > 0 && (
                <div className="mt-4">
                  <label className="text-[16px] text-gray-600" htmlFor="billingAddressSelect">
                    Saved billing addresses
                  </label>
                  <select
                    id="billingAddressSelect"
                    className="mt-2 block h-12 w-full cursor-pointer rounded-md border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    value={billingAddressId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setBillingAddressId(value);

                      if (value === NEW_BILLING_ADDRESS_ID) {
                        form.setValue('billingAddress', {
                          firstName: '',
                          lastName: '',
                          company: '',
                          phone: '',
                          address1: '',
                          address2: '',
                          city: '',
                          province: '',
                          postalCode: '',
                          countryCode: '',
                        });
                        return;
                      }

                      const selected = billingAddressOptions.find((option) => option.id === value);
                      if (selected) {
                        form.setValue('billingAddress', selected.address);
                      }
                    }}
                  >
                    {billingAddressOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                    <option value={NEW_BILLING_ADDRESS_ID}>Use a new billing address</option>
                  </select>
                </div>
              )}

              <AddressFormFields prefix="billingAddress" countryOptions={countryOptions} className="mt-4" />
            </>
          )}

          {sameAsShipping && (
            <div className="-mt-2 mb-4">
              <AddressDisplay address={shippingAddress} countryOptions={countryOptions} />
            </div>
          )}

          <div className="mt-4">{children}</div>

          <FormError />
        </completeCartFetcher.Form>

        <div className="block lg:hidden">
          <CheckoutOrderSummary name="checkout" submitButton={<PaymentSubmitButton />} />
        </div>

        <div className="hidden lg:block">
          <PaymentSubmitButton />
        </div>
      </RemixFormProvider>
    </>
  );
};
