import clsx from 'clsx';
import { FC, Fragment, ReactNode } from 'react';
import { Link } from 'react-router';
import { ButtonLink } from '../buttons/ButtonLink';

export interface Breadcrumb {
  label: ReactNode;
  url?: string;
}

export interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  className?: string;
}

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ breadcrumbs, className }) => (
  <nav aria-label="Breadcrumb" className={clsx('breadcrumbs', className)}>
    <ol className="flex flex-wrap items-center gap-2.5 text-sm leading-none text-primary-200 md:mt-0">
      {breadcrumbs.map((breadcrumb, breadcrumbIdx) => (
        <Fragment key={breadcrumbIdx}>
          <li>
            {breadcrumb.url ? (
              <ButtonLink
                size="sm"
                as={(buttonProps) => (
                  <Link viewTransition prefetch="viewport" {...buttonProps} to={breadcrumb.url || ''} />
                )}
                className="!text-primary-200 no-underline hover:!text-primary-50 hover:underline"
              >
                {breadcrumb.label}
              </ButtonLink>
            ) : (
              <span className="font-bold text-primary-200">{breadcrumb.label}</span>
            )}
          </li>
          {breadcrumbIdx !== breadcrumbs.length - 1 && <li>/</li>}
        </Fragment>
      ))}
    </ol>
  </nav>
);
