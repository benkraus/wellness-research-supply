import { useSiteDetails } from '@app/hooks/useSiteDetails';
import clsx from 'clsx';
import type { FC } from 'react';
import { Link } from 'react-router';

export const LogoStoreName: FC<{ primary?: boolean; className?: string; theme?: 'dark' | 'light' }> = ({
  primary,
  className,
  theme = 'dark',
}) => {
  const siteDetails = useSiteDetails();
  const store = siteDetails?.store;
  const settings = siteDetails?.settings;

  if (!store || !settings) return null;

  const logoSrc = theme === 'light' ? '/assets/brand/wrs.svg' : '/assets/brand/wrs-gradient.svg';

  const Content = (
    <>
      <img src={logoSrc} alt={store.name} className="h-full w-auto object-contain" />
      <span className="sr-only">{store.name}</span>
    </>
  );

  return (
    <Link
      viewTransition
      to="/"
      prefetch="viewport"
      className={clsx('logo-header flex flex-nowrap items-center justify-center', className)}
    >
      {primary ? <h1 className="flex h-full items-center">{Content}</h1> : Content}
    </Link>
  );
};
