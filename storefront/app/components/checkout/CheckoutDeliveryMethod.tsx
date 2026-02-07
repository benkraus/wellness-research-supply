import { Alert } from '@app/components/common/alert/Alert';
import { Button } from '@app/components/common/buttons/Button';
import { useCheckout } from '@app/hooks/useCheckout';
import { CheckoutStep } from '@app/providers/checkout-provider';
import {
  ChooseCheckoutShippingMethodsFormData,
  shippingMethodsSchema,
} from '@app/routes/api.checkout.shipping-methods';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@lambdacurry/forms/remix-hook-form';
import {
  checkAccountDetailsComplete,
  checkDeliveryMethodComplete,
  getShippingOptionsByProfile,
} from '@libs/util/checkout';
import { formatPrice } from '@libs/util/prices';
import type { StoreCart, StoreCartShippingOption } from '@medusajs/types';
import type { BaseCartShippingMethod } from '@medusajs/types/dist/http/cart/common';
import { FC, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';
import { CheckoutSectionHeader } from './CheckoutSectionHeader';
import { ShippingOptionsRadioGroup } from './checkout-fields/ShippingOptionsRadioGroup/ShippingOptionsRadioGroup';

const SHIPPING_OPTIONS_PAGE_SIZE = 12;

const getShippingOptionsDefaultValues = (
  cart: StoreCart,
  shippingOptionsByProfile: { [key: string]: StoreCartShippingOption[] },
) => {
  const values = cart.shipping_methods?.map((sm) => sm.shipping_option_id) ?? [];

  return Object.values(shippingOptionsByProfile).reduce((acc, shippingOptions) => {
    const match = shippingOptions.find((so) => values.includes(so.id));
    acc.push(match ? match.id : shippingOptions[0].id);
    return acc;
  }, [] as string[]);
};

const getDefaultValues = (cart: StoreCart, shippingOptionsByProfile: { [key: string]: StoreCartShippingOption[] }) =>
  ({
    cartId: cart.id,
    shippingOptionIds: getShippingOptionsDefaultValues(cart, shippingOptionsByProfile),
  }) as ChooseCheckoutShippingMethodsFormData;

const areArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export interface CheckoutDeliveryMethodProps {
  showHeader?: boolean;
}

export const CheckoutDeliveryMethod: FC<CheckoutDeliveryMethodProps> = ({ showHeader = true }) => {
  const fetcher = useFetcher<{ errors?: unknown; cart?: StoreCart }>();
  const { step, shippingOptions, setStep, goToNextStep, cart, isCartMutating } = useCheckout();
  const isActiveStep = step === CheckoutStep.ACCOUNT_DETAILS;
  const autoSelectRef = useRef(false);
  const previousFetcherState = useRef(fetcher.state);
  const [visibleOptionsByProfile, setVisibleOptionsByProfile] = useState<Record<string, number>>({});

  const hasErrors = !!fetcher.data?.errors;
  const hasCompletedAccountDetails = cart ? checkAccountDetailsComplete(cart) : false;
  const shippingOptionsByProfile = useMemo(() => getShippingOptionsByProfile(shippingOptions), [shippingOptions]);
  const isComplete = useMemo(
    () => (cart ? checkDeliveryMethodComplete(cart, shippingOptions) : false),
    [cart, shippingOptions],
  );
  const selectedShippingAmounts = useMemo(() => {
    if (!cart?.shipping_methods?.length) return {};

    return cart.shipping_methods.reduce<Record<string, number>>((acc, method) => {
      if (method.shipping_option_id && typeof method.amount === 'number') {
        acc[method.shipping_option_id] = method.amount;
      }
      return acc;
    }, {});
  }, [cart?.shipping_methods]);

  const defaultValues: ChooseCheckoutShippingMethodsFormData = useMemo(() => {
    if (!cart) {
      return {
        cartId: '',
        shippingOptionIds: [],
      } as ChooseCheckoutShippingMethodsFormData;
    }

    return getDefaultValues(cart, shippingOptionsByProfile);
  }, [cart, shippingOptionsByProfile]);

  const form = useRemixForm({
    resolver: zodResolver(shippingMethodsSchema),
    defaultValues,
    fetcher,
    submitConfig: {
      method: 'post',
      action: '/api/checkout/shipping-methods',
    },
  });

  const values = form.watch('shippingOptionIds');

  useEffect(() => {
    const methodIds = cart?.shipping_methods
      ?.map((method) => method.shipping_option_id)
      .filter((id): id is string => Boolean(id));

    if (!methodIds?.length) return;
    const currentValues = (values ?? []) as string[];
    if (areArraysEqual(currentValues, methodIds)) return;

    form.setValue('shippingOptionIds', methodIds);
  }, [cart?.shipping_methods, form, values]);

  useEffect(() => {
    const wasSubmitting = ['submitting', 'loading'].includes(previousFetcherState.current);
    const isIdle = fetcher.state === 'idle';

    if (isActiveStep && wasSubmitting && isIdle && !hasErrors && isComplete) {
      goToNextStep();
    }

    previousFetcherState.current = fetcher.state;
  }, [fetcher.state, goToNextStep, hasErrors, isActiveStep, isComplete]);

  const showCompleted = !isActiveStep && hasCompletedAccountDetails;

  useEffect(() => {
    if (!isActiveStep) return;
    if (!hasCompletedAccountDetails) return;
    if (!cart?.region) return;

    const profiles = Object.values(shippingOptionsByProfile);
    if (!profiles.length) return;
    const hasSingleOption = profiles.every((options) => options.length === 1);
    if (!hasSingleOption) return;
    if (cart?.shipping_methods?.length) return;
    if (autoSelectRef.current) return;

    autoSelectRef.current = true;
    const selectedIds = profiles.map((options) => options[0].id);
    form.setValue('shippingOptionIds', selectedIds);
    form.handleSubmit();
  }, [cart?.region, cart?.shipping_methods, form, hasCompletedAccountDetails, isActiveStep, shippingOptionsByProfile]);

  const region = cart?.region;
  if (!region) return null;

  return (
    <div className="checkout-delivery-method">
      {showHeader && (
        <CheckoutSectionHeader completed={showCompleted} setStep={setStep} step={CheckoutStep.ACCOUNT_DETAILS}>
          Shipping
        </CheckoutSectionHeader>
      )}

      {!isActiveStep && (
        <>
          <dl>
            {cart.shipping_methods?.map((shippingMethod: BaseCartShippingMethod, shippingMethodIndex) => {
              const { id, shipping_option_id, amount } = shippingMethod;
              const shipping_option = shippingOptions.find((so) => so.id === shipping_option_id);

              return (
                <Fragment key={id}>
                  <dt className={`${shippingMethodIndex > 0 ? 'mt-6' : 'mt-4'} text-sm font-bold text-gray-700`}>
                    Delivery method for: All items
                  </dt>
                  <dd className="mt-0.5">
                    {shipping_option?.name} (
                    {formatPrice(amount, {
                      currency: cart?.region?.currency_code,
                    })}
                    )
                  </dd>
                </Fragment>
              );
            })}
          </dl>
        </>
      )}

      {isActiveStep && !hasCompletedAccountDetails && (
        <Alert type="info" tone="dark" className="my-6">
          Enter your shipping details and calculate shipping to see delivery options.
        </Alert>
      )}

      {isActiveStep && hasCompletedAccountDetails && (
        <RemixFormProvider {...form}>
          <fetcher.Form>
            <TextField type="hidden" name="cartId" value={cart.id} />
            {Object.entries(shippingOptionsByProfile).map(
              ([profileId, shippingOptions], shippingOptionProfileIndex) => {
                if (shippingOptions.length < 1) return null;

                const selectedId = values?.[shippingOptionProfileIndex] ?? null;
                const visibleCount = visibleOptionsByProfile[profileId] ?? SHIPPING_OPTIONS_PAGE_SIZE;
                const hasMore = shippingOptions.length > visibleCount;

                // Only render a chunk at a time to keep the page responsive when there are lots of options.
                let visibleShippingOptions = shippingOptions.slice(0, visibleCount);
                if (
                  selectedId &&
                  !visibleShippingOptions.some((option) => option.id === selectedId)
                ) {
                  const selectedOption = shippingOptions.find((option) => option.id === selectedId);
                  if (selectedOption) {
                    visibleShippingOptions = [selectedOption, ...visibleShippingOptions];
                  }
                }

                return (
                  <Fragment key={profileId}>
                    {shippingOptionProfileIndex > 0 && <hr className="my-6" />}

                    {!!cart?.shipping_methods?.length && (
                      <Alert type="info" tone="dark" className="my-6">
                        Choose your delivery option
                      </Alert>
                    )}
                    <ShippingOptionsRadioGroup
                      disabled={isCartMutating}
                      name={`shippingOptionIds.${shippingOptionProfileIndex}`}
                      shippingOptions={visibleShippingOptions}
                      region={region}
                      value={values?.[shippingOptionProfileIndex] ?? null}
                      selectedAmounts={selectedShippingAmounts}
                      onValueChange={(value) => form.setValue(`shippingOptionIds.${shippingOptionProfileIndex}`, value)}
                    />

                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs text-primary-200/80">
                        Showing {Math.min(visibleCount, shippingOptions.length)} of {shippingOptions.length} options
                      </div>
                      {hasMore && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-primary-200 underline underline-offset-4"
                          onClick={() => {
                            setVisibleOptionsByProfile((prev) => ({
                              ...prev,
                              [profileId]: (prev[profileId] ?? SHIPPING_OPTIONS_PAGE_SIZE) + SHIPPING_OPTIONS_PAGE_SIZE,
                            }));
                          }}
                        >
                          Show more
                        </Button>
                      )}
                    </div>
                  </Fragment>
                );
              },
            )}
          </fetcher.Form>
        </RemixFormProvider>
      )}
    </div>
  );
};
