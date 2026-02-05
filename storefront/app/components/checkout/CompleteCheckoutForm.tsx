import { SubmitButton } from '@app/components/common/remix-hook-form/buttons/SubmitButton';
import { useCheckout } from '@app/hooks/useCheckout';
import { useCustomer } from '@app/hooks/useCustomer';
import { CompleteCheckoutFormData, completeCheckoutSchema } from '@app/routes/api.checkout.complete';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, TextField } from '@lambdacurry/forms/remix-hook-form';
import { type MedusaAddress } from '@libs/types';
import { medusaAddressToAddress } from '@libs/util';
import { FetcherKeys } from '@libs/util/fetcher-keys';
import { FC, FormEvent, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { SubmitFunction, useFetcher } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';
import { CheckoutOrderSummary } from '.';
import { FormError } from '../common/remix-hook-form/forms/FormError';
import { AddressFormFields } from './address/AddressFormFields';
import { formatPhoneNumberInput } from '@libs/util/phoneNumber';

export interface CompleteCheckoutFormProps extends PropsWithChildren {
  id: string;
  providerId: string;
  submitMessage?: string;
  className?: string;
  paymentMethodToggle?: React.ReactNode;
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
  paymentMethodToggle,
}) => {
  const { activePaymentSession, cart, isCartMutating } = useCheckout();
  const { customer } = useCustomer();

  const completeCartFetcher = useFetcher<never>({ key: FetcherKeys.cart.completeCheckout });

  const [submitting, setSubmitting] = useState(false);
  const NEW_BILLING_ADDRESS_ID = 'new';
  const [billingAddressId, setBillingAddressId] = useState(NEW_BILLING_ADDRESS_ID);

  const isSubmitting = ['submitting', 'loading'].includes(completeCartFetcher.state) || submitting;
  const hasCart = Boolean(cart);

  const emptyAddress: MedusaAddress = {} as MedusaAddress;
  const defaultBillingAddress = hasCart
    ? medusaAddressToAddress(cart?.billing_address as MedusaAddress)
    : medusaAddressToAddress(emptyAddress);
  const shippingAddress = hasCart
    ? medusaAddressToAddress(cart?.shipping_address as MedusaAddress)
    : medusaAddressToAddress(emptyAddress);

  const countryOptions =
    (cart?.region?.countries?.map((country) => ({
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

  const metadata = (customer?.metadata ?? {}) as Record<string, unknown>;
  const venmoUseProfile = metadata.venmo_default_use_profile === true;
  const venmoCustom = typeof metadata.venmo_default_contact === 'string' ? metadata.venmo_default_contact : '';
  const venmoProfileContact = customer?.email || customer?.phone || '';
  const venmoDefaultContact = venmoUseProfile
    ? venmoProfileContact || venmoCustom
    : venmoCustom;

  const defaultValues: CompleteCheckoutFormData = {
    cartId: cart?.id ?? '',
    sameAsShipping: true,
    billingAddress: defaultBillingAddress,
    providerId,
    venmoContact: venmoDefaultContact,
    edebitAccountName: '',
    edebitRoutingNumber: '',
    edebitAccountNumber: '',
    edebitBankName: '',
    edebitPhone: formatPhoneNumberInput(customer?.phone || cart?.shipping_address?.phone || ''),
    edebitSavedMethodId: '',
    edebitSaveMethod: false,
  };

  const form = useRemixForm({
    resolver: zodResolver(completeCheckoutSchema),
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    fetcher: completeCartFetcher,
    submitConfig: {
      method: 'post',
      action: '/api/checkout/complete',
    },
  });

  const sameAsShipping = form.watch('sameAsShipping');
  const billingAddress = form.watch('billingAddress');
  const isBillingDisabled = sameAsShipping === true;
  const shippingAddressSnapshot = useMemo(() => shippingAddress, [shippingAddress]);

  useEffect(() => {
    if (!sameAsShipping) return;
    const current = form.getValues('billingAddress');
    const next = shippingAddressSnapshot;
    const fields = ['firstName', 'lastName', 'company', 'phone', 'address1', 'address2', 'city', 'province', 'postalCode', 'countryCode'] as const;

    const isSame = fields.every((field) => current?.[field] === next?.[field]);
    if (isSame) return;

    form.setValue('billingAddress', next);
  }, [form, sameAsShipping, shippingAddressSnapshot]);

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
      className="mt-4 w-full lg:w-auto"
      disabled={isSubmitting || isCartMutating || (!sameAsShipping && !billingAddress)}
    >
      {isSubmitting ? 'Confirming...' : (submitMessage ?? 'Place order')}
    </SubmitButton>
  );

  if (!cart) return null;

  if (!activePaymentSession) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
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

          <h2 className="text-2xl font-bold text-primary-50">Billing</h2>

          <Checkbox className="my-4" name="sameAsShipping" label="Same as shipping address" />

          {!isBillingDisabled && billingAddressOptions.length > 0 && (
            <div className="mt-4">
              <label className="text-[16px] text-primary-200" htmlFor="billingAddressSelect">
                Saved billing addresses
              </label>
              <select
                id="billingAddressSelect"
                className="mt-2 block h-12 w-full cursor-pointer rounded-md border border-primary-900/40 bg-highlight-100 px-3 text-sm text-primary-50 shadow-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/40"
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

          <AddressFormFields
            prefix="billingAddress"
            countryOptions={countryOptions}
            className="mt-4"
            disabled={isBillingDisabled}
          />

          {paymentMethodToggle ? <div className="mt-6">{paymentMethodToggle}</div> : null}

          <div className={paymentMethodToggle ? 'mt-6' : 'mt-8'}>{children}</div>

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
