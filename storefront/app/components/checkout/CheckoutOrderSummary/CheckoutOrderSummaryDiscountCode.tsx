import { SubmitButton } from '@app/components/common/remix-hook-form/buttons/SubmitButton';
import { FormError } from '@app/components/common/remix-hook-form/forms/FormError';
import { StyledTextField } from '@app/components/common/remix-hook-form/forms/fields/StyledTextField';
import { discountCodeSchema } from '@app/routes/api.checkout.discount-code';
import { zodResolver } from '@hookform/resolvers/zod';
import type { HttpTypes, PromotionDTO } from '@medusajs/types';
import { FC, useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';
import { RemovePromotionCodeButton } from './RemoveDiscountCodeButton';

export interface CheckoutOrderSummaryDiscountCodeProps {
  cart: HttpTypes.StoreCart & { promotions: PromotionDTO[] };
}

export const CheckoutOrderSummaryDiscountCode: FC<CheckoutOrderSummaryDiscountCodeProps> = ({ cart }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher<{
    errors?: { [key: string]: string };
  }>();
  const hasDiscounts = !!cart.promotions?.length;
  const hasErrors = Object.keys(fetcher.data?.errors || {}).length > 0;
  const isSubmitting = ['submitting', 'loading'].includes(fetcher.state);
  const checkoutFieldClassName =
    '[&_label]:text-primary-200 [&_input]:!bg-highlight-100 [&_input]:text-primary-50 [&_input]:border-primary-700/60 [&_input]:placeholder:text-primary-200/70 [&_input]:focus:border-primary-400 [&_input]:focus:ring-primary-400/40 [&_input]:shadow-[0_0_0_1px_rgba(20,120,150,0.35)] [&_input:-webkit-autofill]:!shadow-[0_0_0_1000px_rgb(6_33_50)_inset] [&_input:-webkit-autofill]:!text-primary-50';

  const form = useRemixForm({
    resolver: zodResolver(discountCodeSchema),
    defaultValues: {
      cartId: cart.id,
      code: '',
    },

    fetcher,
    submitConfig: {
      method: 'post',
      action: '/api/checkout/discount-code',
    },
  });
  const formResetRef = useRef(form.reset);
  const prevFetcherState = useRef(fetcher.state);
  formResetRef.current = form.reset;

  useEffect(() => {
    const wasSubmitting = ['submitting', 'loading'].includes(prevFetcherState.current);
    const isIdle = fetcher.state === 'idle';

    if (wasSubmitting && isIdle && !hasErrors) {
      formResetRef.current();
      inputRef.current?.focus();
    }

    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, hasErrors]);

  return (
    <div className="mb-6">
      <RemixFormProvider {...form}>
        <fetcher.Form ref={formRef} onSubmit={form.handleSubmit}>
          <input type="hidden" name="cartId" value={cart.id} />
          <div className="!my-0 !flex items-stretch gap-2">
            <StyledTextField
              name="code"
              className={`flex-grow ${checkoutFieldClassName}`}
              placeholder="Discount code"
              aria-label="discount code"
            />
            <SubmitButton
              type="submit"
              className="flex h-12 items-center justify-center rounded-full border border-primary-200/70 px-6 text-primary-200 hover:text-primary-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Applying...' : 'Apply'}
            </SubmitButton>
          </div>
          <FormError />
        </fetcher.Form>
      </RemixFormProvider>

      {hasDiscounts && (
        <div className="mt-2">
          {cart.promotions?.map((promotion) => (
            <RemovePromotionCodeButton key={promotion.id} cart={cart} promotion={promotion} />
          ))}
        </div>
      )}
    </div>
  );
};
