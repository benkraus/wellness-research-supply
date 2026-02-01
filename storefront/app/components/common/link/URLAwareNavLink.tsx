import { NavLink, useLocation } from 'react-router';
import type { NavLinkProps } from 'react-router';
import type { FC, HTMLAttributes, PropsWithChildren } from 'react';

export interface AwareNavLinkProps {
  url: string;
  newTab?: boolean;
  prefetch?: NavLinkProps['prefetch'];
  preventScrollReset?: NavLinkProps['preventScrollReset'];
  className?: string | ((props: { isActive: boolean }) => string | undefined);
}

export const URLAwareNavLink: FC<
  PropsWithChildren<AwareNavLinkProps & Omit<HTMLAttributes<HTMLAnchorElement>, 'className'>>
> = ({ url, newTab, prefetch = 'intent', preventScrollReset, className, children, ...rest }) => {
  const location = useLocation();
  const disableViewTransition = location.pathname.startsWith('/checkout');
  const isExternal = url.startsWith('http') || url.startsWith('mailto') || url.startsWith('tel');
  const target = newTab ? '_blank' : '_self';
  const rel = newTab ? 'noopener noreferrer' : undefined;

  if (isExternal)
    return (
      <a
        href={url}
        className={typeof className === 'function' ? className({ isActive: false }) : className}
        target={target}
        rel={rel}
        {...rest}
      >
        {children}
      </a>
    );

  return (
    <NavLink
      viewTransition={!disableViewTransition}
      className={className}
      to={url}
      prefetch={prefetch}
      preventScrollReset={preventScrollReset}
      target={target}
      rel={rel}
      {...rest}
    >
      {children}
    </NavLink>
  );
};
