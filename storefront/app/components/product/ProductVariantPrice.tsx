import { formatPrice, getVariantPrices } from '@libs/util/prices';
import { StoreProductVariant } from '@medusajs/types';
import isNumber from 'lodash/isNumber';
import { type FC } from 'react';

export interface ProductVariantPriceProps {
  variant: StoreProductVariant;
  currencyCode: string;
}

export const ProductVariantPrice: FC<ProductVariantPriceProps> = ({ variant, currencyCode }) => {
  const { original, calculated } = getVariantPrices(variant);

  const originalValue = original ?? 0;
  const calculatedValue = calculated ?? originalValue;

  const hasSale = isNumber(calculatedValue) && calculatedValue < originalValue;

  return (
    <>
      {hasSale ? (
        <span className="inline-flex items-center gap-1">
          <span>{formatPrice(calculatedValue, { currency: currencyCode })}</span>
          <s className="text-gray-400">{formatPrice(originalValue, { currency: currencyCode })}</s>
        </span>
      ) : (
        formatPrice(originalValue, { currency: currencyCode })
      )}
    </>
  );
};
