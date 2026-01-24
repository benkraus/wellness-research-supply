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
import { useEffect, useMemo } from 'react';
import { FieldErrors } from 'react-hook-form';
import { useFetcher } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';
import { SubmitButton } from '../common/remix-hook-form/buttons/SubmitButton';
import { FormError } from '../common/remix-hook-form/forms/FormError';
import { CheckoutSectionHeader } from './CheckoutSectionHeader';
import { AddressFormFields } from './address/AddressFormFields';
import { AddressDisplay } from './address/AddressDisplay';
import { selectInitialShippingAddress } from './checkout-form-helpers';

const NEW_SHIPPING_ADDRESS_ID = 'new';

export const CheckoutAccountDetails = () => {
  const checkoutAccountDetailsFormFetcher = useFetcher<{
    errors: FieldErrors;
  }>({ key: FetcherKeys.cart.accountDetails });
  const { customer } = useCustomer();
  const { step, setStep, goToNextStep, cart, isCartMutating } = useCheckout();
  const isActiveStep = step === CheckoutStep.ACCOUNT_DETAILS;

  if (!cart) return null;

  const initialShippingAddress = selectInitialShippingAddress(cart, customer ?? undefined);

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
    if (!customer?.addresses?.length) return [];

    return customer.addresses.map((address) => {
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
  }, [customer?.addresses]);

  const defaultValues = {
    cartId: cart.id,
    email: customer?.email || cart.email || '',
    customerId: customer?.id,
    allowSuggestions: true,
    shippingAddress: {
      ...medusaAddressToAddress(initialShippingAddress as MedusaAddress),
    },
    shippingAddressId: initialShippingAddressId,
  };

  const form = useRemixForm({
    resolver: zodResolver(accountDetailsSchema),
    defaultValues,
    fetcher: checkoutAccountDetailsFormFetcher,
    submitConfig: {
      method: 'post',
      action: '/api/checkout/account-details',
    },
  });

  const shippingAddress = form.watch('shippingAddress');
  const shippingAddressId = form.watch('shippingAddressId');

  useEffect(() => {
    if (isActiveStep && !isSubmitting && !hasErrors && isComplete) {
      form.reset();
      goToNextStep();
    }
  }, [isSubmitting, isComplete]);

  useEffect(() => {
    if (!addressOptions.length) return;
    if (!shippingAddressId || shippingAddressId === NEW_SHIPPING_ADDRESS_ID) return;

    const selected = addressOptions.find((option) => option.id === shippingAddressId);
    if (selected) {
      form.setValue('shippingAddress', selected.address);
    }
  }, [addressOptions, form, shippingAddressId]);

  const handleCancel = () => {
    goToNextStep();
  };

  const showCompleted = isComplete && !isActiveStep;

  return (
    <div className="checkout-account-details">
      <CheckoutSectionHeader completed={showCompleted} setStep={setStep} step={CheckoutStep.ACCOUNT_DETAILS}>
        Account details
      </CheckoutSectionHeader>

      {!isActiveStep && isComplete && (
        <AddressDisplay title="Shipping Address" address={shippingAddress} countryOptions={countryOptions} />
      )}

      {isActiveStep && (
        <>
          {customer?.email ? (
            <p className="mt-2 text-sm mb-2">To get started, please enter your shipping address.</p>
          ) : (
            <p className="mt-2 text-sm mb-4">To get started, enter your email address.</p>
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
                className="[&_input]:!ring-0 mb-2"
              />

              <StyledTextField type="hidden" name="shippingAddressId" />

              {addressOptions.length > 0 && (
                <div className="mt-4">
                  <label className="text-[16px] text-gray-600" htmlFor="shippingAddressSelect">
                    Saved addresses
                  </label>
                  <select
                    id="shippingAddressSelect"
                    className="mt-2 block h-12 w-full cursor-pointer rounded-md border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
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
                        form.setValue('shippingAddress', selected.address);
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
                  {isSubmitting ? 'Saving...' : 'Save and continue'}
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
