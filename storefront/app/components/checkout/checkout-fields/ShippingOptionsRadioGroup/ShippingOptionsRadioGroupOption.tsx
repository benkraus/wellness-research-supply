import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import { RadioGroupItem } from '@lambdacurry/forms/ui';
import { getShippingOptionAmount, getShippingOptionTimeline } from '@libs/util/checkout';
import { formatPrice } from '@libs/util/prices';
import { StoreCartShippingOption, StoreRegion } from '@medusajs/types';
import clsx from 'clsx';
import { FC } from 'react';

export interface ShippingOptionsRadioGroupOptionProps {
  shippingOption: StoreCartShippingOption;
  region: StoreRegion;
  value?: string | null;
  selectedAmount?: number | null;
}

export const ShippingOptionsRadioGroupOption: FC<ShippingOptionsRadioGroupOptionProps> = ({
  shippingOption,
  region,
  value,
  selectedAmount,
}) => {
  const isSelected = value === shippingOption.id;
  const displayAmount = typeof selectedAmount === 'number' ? selectedAmount : getShippingOptionAmount(shippingOption);
  const timeline = getShippingOptionTimeline(shippingOption);

  return (
    <div className="relative col-span-1">
      <label htmlFor={shippingOption.id} className="cursor-pointer">
        <div
          className={clsx(
            'group relative flex h-full flex-col justify-between rounded-lg border bg-highlight-100/90 p-4 shadow-[0_16px_30px_rgba(2,12,20,0.35)]',
            'active:ring-primary-400/50 hover:border-primary-700/50 focus:outline-none active:ring-2',
            isSelected ? 'border-primary-400/70' : 'border-primary-900/40',
          )}
        >
          <div className="flex justify-between gap-1">
            <div className="block text-sm font-bold text-primary-50">{shippingOption.name}</div>
            <RadioGroupItem
              id={shippingOption.id}
              value={shippingOption.id}
              className="text-primary-400 h-5 w-5 border-0"
              indicator={<CheckCircleIcon className="text-primary-400 h-5 w-5" aria-hidden="true" />}
            />
          </div>
          <div className="mt-6 flex items-end justify-between text-sm text-primary-200">
            <div>{formatPrice(displayAmount, { currency: region.currency_code })}</div>
          </div>
          {timeline && (
            <div className="mt-2 text-xs text-primary-200/80">Estimated delivery: {timeline} business days</div>
          )}
          <div
            className={clsx(
              'pointer-events-none absolute -inset-px rounded-lg border-2 active:border',
              isSelected ? 'border-primary-400/70' : 'border-transparent',
            )}
            aria-hidden="true"
          />
        </div>
      </label>
    </div>
  );
};
