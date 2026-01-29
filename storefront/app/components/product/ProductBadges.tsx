import { ComingSoonBadge } from '@app/components/badges/ComingSoonBadge';
import { SoldOutBadge } from '@app/components/badges/SoldOutBadge';
import { useProductInventory } from '@app/hooks/useProductInventory';
import type { StoreProduct } from '@medusajs/types';
import { FC, HTMLAttributes } from 'react';

interface ProductBadgesProps extends HTMLAttributes<HTMLElement> {
  product: StoreProduct;
  className?: string;
}

export const ProductBadges: FC<ProductBadgesProps> = ({ product, className }) => {
  const productInventory = useProductInventory(product);
  const isComingSoon = productInventory.isComingSoon;
  const isSoldOut = productInventory.isSoldOut && !isComingSoon;

  return (
    <div className={className}>
      {isComingSoon && <ComingSoonBadge />}
      {isSoldOut && <SoldOutBadge />}
    </div>
  );
};
