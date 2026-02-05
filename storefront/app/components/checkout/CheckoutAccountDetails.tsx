import { Actions } from '@app/components/common/actions/Actions';
import { Button } from '@app/components/common/buttons/Button';
import { StyledTextField } from '@app/components/common/remix-hook-form/forms/fields/StyledTextField';
import { useCheckout } from '@app/hooks/useCheckout';
import { useCustomer } from '@app/hooks/useCustomer';
import { CheckoutStep } from '@app/providers/checkout-provider';
import { accountDetailsSchema } from '@app/routes/api.checkout.account-details';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@lambdacurry/forms/remix-hook-form';
import type { MedusaAddress } from '@libs/types';
import { medusaAddressToAddress } from '@libs/util';
import { checkAccountDetailsComplete } from '@libs/util/checkout';
import { FetcherKeys } from '@libs/util/fetcher-keys';
import { formatPhoneNumberInput } from '@libs/util/phoneNumber';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useFetcher } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';
import { SubmitButton } from '../common/remix-hook-form/buttons/SubmitButton';
import { FormError } from '../common/remix-hook-form/forms/FormError';
import { CheckoutSectionHeader } from './CheckoutSectionHeader';
import { AddressFormFields } from './address/AddressFormFields';
import { AddressDisplay } from './address/AddressDisplay';
import { selectInitialShippingAddress } from './checkout-form-helpers';

const NEW_SHIPPING_ADDRESS_ID = 'new';

interface CheckoutAccountDetailsContentProps {
  cart: NonNullable<ReturnType<typeof useCheckout>['cart']>;
  customerData: ReturnType<typeof useCustomer>['customer'];
  step: ReturnType<typeof useCheckout>['step'];
  setStep: ReturnType<typeof useCheckout>['setStep'];
  goToNextStep: ReturnType<typeof useCheckout>['goToNextStep'];
  isCartMutating: ReturnType<typeof useCheckout>['isCartMutating'];
}

const CheckoutAccountDetailsContent = ({
  cart,
  customerData,
  step,
  setStep,
  goToNextStep,
  isCartMutating,
}: CheckoutAccountDetailsContentProps) => {
  const checkoutAccountDetailsFormFetcher = useFetcher<{
    errors: FieldErrors;
  }>({ key: FetcherKeys.cart.accountDetails });
  const isActiveStep = step === CheckoutStep.ACCOUNT_DETAILS;

  const initialShippingAddress = selectInitialShippingAddress(cart, customerData ?? undefined);
  const isComplete = checkAccountDetailsComplete(cart);
  const isSubmitting = ['submitting', 'loading'].includes(checkoutAccountDetailsFormFetcher.state);
  const hasErrors = !!checkoutAccountDetailsFormFetcher.data?.errors;
  const initialShippingAddressId = initialShippingAddress?.id ?? NEW_SHIPPING_ADDRESS_ID;

  const countryOptions =
    (cart.region?.countries?.map((country) => ({
      value: country.iso_2,
      label: country.display_name,
    })) as { value: string; label: string }[]) ?? [];

  const addressOptions = useMemo(() => {
    if (!customerData?.addresses?.length) return [];

    return customerData.addresses.map((address) => {
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
  }, [customerData?.addresses]);

  const withPhoneFallback = useCallback(
    (address: ReturnType<typeof medusaAddressToAddress>) => ({
      ...address,
      phone: formatPhoneNumberInput(address.phone || customerData?.phone || ''),
    }),
    [customerData?.phone],
  );

  const defaultValues = {
    cartId: cart.id,
    email: customerData?.email || cart.email || '',
    customerId: customerData?.id,
    allowSuggestions: true,
    shippingAddress: {
      ...withPhoneFallback(medusaAddressToAddress(initialShippingAddress as MedusaAddress)),
    },
    shippingAddressId: initialShippingAddressId,
  };

  const form = useRemixForm({
    resolver: zodResolver(accountDetailsSchema),
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    fetcher: checkoutAccountDetailsFormFetcher,
    submitConfig: {
      method: 'post',
      action: '/api/checkout/account-details',
    },
  });

  const shippingAddress = form.watch('shippingAddress');
  const shippingAddressId = form.watch('shippingAddressId');
  const checkoutFieldClassName =
    '[&_label]:text-primary-200 [&_input]:!bg-highlight-100 [&_input]:text-primary-50 [&_input]:border-primary-900/40 [&_input]:placeholder:text-primary-200/70 [&_input]:focus:border-primary-400 [&_input]:focus:ring-primary-400/40 [&_input:-webkit-autofill]:!shadow-[0_0_0_1000px_rgb(6_33_50)_inset] [&_input:-webkit-autofill]:!text-primary-50';

  const previousFetcherState = useRef(checkoutAccountDetailsFormFetcher.state);

  useEffect(() => {
    const wasSubmitting = ['submitting', 'loading'].includes(previousFetcherState.current);
    const isIdle = checkoutAccountDetailsFormFetcher.state === 'idle';

    if (isActiveStep && wasSubmitting && isIdle && !hasErrors && isComplete) {
      form.reset();

      if (cart.shipping_methods?.length) {
        goToNextStep();
      }
    }

    previousFetcherState.current = checkoutAccountDetailsFormFetcher.state;
  }, [
    cart.shipping_methods?.length,
    checkoutAccountDetailsFormFetcher.state,
    form,
    goToNextStep,
    hasErrors,
    isActiveStep,
    isComplete,
  ]);

  useEffect(() => {
    if (!addressOptions.length) return;
    if (!shippingAddressId || shippingAddressId === NEW_SHIPPING_ADDRESS_ID) return;

    const selected = addressOptions.find((option) => option.id === shippingAddressId);
    if (!selected) {
      if (form.formState.isDirty) return;

      const fallbackOption =
        addressOptions.find((option) => option.id === initialShippingAddressId) ?? addressOptions[0];

      if (!fallbackOption) return;

      form.setValue('shippingAddressId', fallbackOption.id);
      form.setValue('shippingAddress', withPhoneFallback(fallbackOption.address));
      return;
    }

    const isEmptyAddress = !Object.values(shippingAddress ?? {}).some((value) => value);
    if (!isEmptyAddress) return;
    if (form.formState.isDirty) return;

    form.setValue('shippingAddress', withPhoneFallback(selected.address));
  }, [
    addressOptions,
    form,
    initialShippingAddressId,
    shippingAddress,
    shippingAddressId,
    withPhoneFallback,
  ]);

  const handleCancel = () => {
    goToNextStep();
  };

  const showCompleted = isComplete && !isActiveStep;
  const handleEdit = () => {
    setStep(CheckoutStep.ACCOUNT_DETAILS);
    requestAnimationFrame(() => {
      document.getElementById('checkout-account-details-form')?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  return (
    <div className="checkout-account-details">
      <CheckoutSectionHeader
        completed={showCompleted}
        setStep={setStep}
        step={CheckoutStep.ACCOUNT_DETAILS}
        onEdit={handleEdit}
      >
        Shipping
      </CheckoutSectionHeader>

      {!isActiveStep && isComplete && (
        <AddressDisplay title="Shipping Address" address={shippingAddress} countryOptions={countryOptions} />
      )}

      {isActiveStep && (
        <>
            {customerData?.email ? (
              <p className="mt-2 text-sm mb-2">Enter your shipping details to calculate delivery options.</p>
            ) : (
              <p className="mt-2 text-sm mb-4">Enter your email and shipping details to calculate delivery options.</p>
            )}

          <RemixFormProvider {...form}>
            <checkoutAccountDetailsFormFetcher.Form id="checkout-account-details-form" onSubmit={form.handleSubmit}>
              <TextField type="hidden" name="cartId" />
              <TextField type="hidden" name="customerId" />

              <StyledTextField
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email address"
                label="Email Address"
                className={clsx('[&_input]:!ring-0 mb-2', checkoutFieldClassName)}
              />

              <StyledTextField type="hidden" name="shippingAddressId" />

              {addressOptions.length > 0 && (
                <div className="mt-4">
                  <label className="text-[16px] text-primary-200" htmlFor="shippingAddressSelect">
                    Saved addresses
                  </label>
                  <select
                    id="shippingAddressSelect"
                    className="mt-2 block h-12 w-full cursor-pointer rounded-md border border-primary-900/40 bg-highlight-100 px-3 text-sm text-primary-50 shadow-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/40"
                    value={shippingAddressId || NEW_SHIPPING_ADDRESS_ID}
                    onChange={(event) => {
                      const value = event.target.value;
                      form.setValue('shippingAddressId', value);

                      if (value === NEW_SHIPPING_ADDRESS_ID) {
                        form.setValue('shippingAddress', {
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

                      const selected = addressOptions.find((option) => option.id === value);
                      if (selected) {
                        form.setValue('shippingAddress', withPhoneFallback(selected.address));
                      }
                    }}
                  >
                    {addressOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                    <option value={NEW_SHIPPING_ADDRESS_ID}>Use a new address</option>
                  </select>
                </div>
              )}

              <AddressFormFields prefix="shippingAddress" countryOptions={countryOptions} className="mt-4" />

              <FormError />

              <Actions>
                <SubmitButton disabled={isSubmitting || isCartMutating}>
                  {isSubmitting
                    ? 'Saving...'
                    : isComplete
                      ? 'Save shipping'
                      : 'Calculate shipping'}
                </SubmitButton>

                {isComplete && (
                  <Button disabled={isSubmitting} onClick={handleCancel}>
                    Cancel edit
                  </Button>
                )}
              </Actions>
            </checkoutAccountDetailsFormFetcher.Form>
          </RemixFormProvider>
        </>
      )}
     </div>
   );
};

export const CheckoutAccountDetails = () => {
  const { cart, step, setStep, goToNextStep, isCartMutating } = useCheckout();
  const { customer: customerData } = useCustomer();

  if (!cart) return null;

  return (
    <CheckoutAccountDetailsContent
      cart={cart}
      customerData={customerData}
      step={step}
      setStep={setStep}
      goToNextStep={goToNextStep}
      isCartMutating={isCartMutating}
    />
  );
};
