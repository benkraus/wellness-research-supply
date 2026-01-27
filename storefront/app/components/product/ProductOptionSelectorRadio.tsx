import { Label, Radio, RadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { formatPrice } from '@libs/util/prices';
import clsx from 'clsx';
import type { FC } from 'react';

export interface ProductOptionSelectorProps {
  option: {
    title: string;
    id: string;
    values: {
      value: string;
      minPrice?: number;
      maxPrice?: number;
      exactPrice?: number;
      discountPercentage?: number;
      disabled?: boolean;
    }[];
  };
  onChange?: (name: string, value: string) => void;
  value?: string;
  currencyCode: string;
}

export const ProductOptionSelectorRadio: FC<ProductOptionSelectorProps> = ({
  option,
  onChange,
  value,
  currencyCode,
}) => {
  const handleChange = (name: string, value: string) => {
    if (onChange) onChange(name, value);
  };

  // Filter unique values
  const uniqueValues = option.values.filter(
    (optionValue, index, self) => self.findIndex((item) => item.value === optionValue.value) === index,
  );

  // Sort values by price (low to high)
  const sortedValues = [...uniqueValues].sort((a, b) => {
    const aPrice = a.minPrice || a.exactPrice || 0;
    const bPrice = b.minPrice || b.exactPrice || 0;
    return aPrice - bPrice;
  });

  return (
    <RadioGroup
      name={`options.${option.id}`}
      value={value}
      onChange={(changedValue) => handleChange(option.id, changedValue)}
    >
      <div className="grid grid-cols-1 gap-2">
        {sortedValues.map((optionValue, valueIndex) => {
          // Format the price display
          let priceDisplay = '';
          let discountDisplay = '';

          if (optionValue.minPrice !== undefined && optionValue.maxPrice !== undefined) {
            if (optionValue.minPrice === optionValue.maxPrice) {
              // Single price
              priceDisplay = formatPrice(optionValue.minPrice, { currency: currencyCode });
            } else {
              // Price range
              priceDisplay = `${formatPrice(optionValue.minPrice, { currency: currencyCode })} – ${formatPrice(optionValue.maxPrice, { currency: currencyCode })}`;
            }
          } else if (optionValue.exactPrice !== undefined) {
            // Exact price
            priceDisplay = formatPrice(optionValue.exactPrice, { currency: currencyCode });

            // Format discount if available
            if (optionValue.discountPercentage) {
              discountDisplay = `${optionValue.discountPercentage}% off`;
            }
          }

          return (
            <Radio
              key={valueIndex}
              value={optionValue.value}
              disabled={optionValue.disabled}
              className={({ checked, disabled }) =>
                clsx(
                  'group',
                  checked
                    ? 'border-primary-400/90 bg-primary-500/25 ring-2 ring-primary-300/80 shadow-[0_12px_30px_-18px_rgba(45,212,191,0.85)]'
                    : 'border-primary-200/30 bg-highlight-100/10 hover:border-primary-300/60 hover:bg-highlight-100/20',
                  'relative col-span-1 flex h-full cursor-pointer flex-col justify-between rounded-lg border px-3 py-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-300/40',
                  disabled ? 'opacity-45 cursor-not-allowed' : '',
                )
              }
            >
              {({ checked }) => (
                <Label as="div" className="flex items-center w-full">
                  {/* Option value on the left */}
                  <div className="flex-grow">
                    <span className={clsx('text-base', checked ? 'text-primary-50' : 'text-primary-100/90')}>
                      {optionValue.value}
                    </span>
                    {optionValue.disabled && (
                      <span className="text-xs text-primary-200/70 ml-2">(not available)</span>
                    )}
                  </div>

                  {/* Price information and check icon on the right */}
                  <div className="flex items-center">
                    {priceDisplay && (
                      <div className="text-right">
                        <span className="text-sm font-normal text-primary-200/90">{priceDisplay}</span>
                        {discountDisplay && (
                          <span className="ml-1 text-xs font-medium text-emerald-200">({discountDisplay})</span>
                        )}
                      </div>
                    )}
                    {checked && <CheckCircleIcon className="text-primary-100 h-5 w-5 ml-2" aria-hidden="true" />}
                  </div>
                </Label>
              )}
            </Radio>
          );
        })}
      </div>
    </RadioGroup>
  );
};
