import { LogoStoreName } from '@app/components/LogoStoreName/LogoStoreName';
import { IconButton } from '@app/components/common/buttons';
import { Container } from '@app/components/common/container/Container';
import { URLAwareNavLink } from '@app/components/common/link';
import { useCart } from '@app/hooks/useCart';
import { useRootLoaderData } from '@app/hooks/useRootLoaderData';
import { useSiteDetails } from '@app/hooks/useSiteDetails';
import { useStorefront } from '@app/hooks/useStorefront';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ShoppingBagIcon from '@heroicons/react/24/outline/ShoppingBagIcon';
import clsx from 'clsx';
import { type FC, useState } from 'react';
import { useLocation } from 'react-router';
import { HeaderSideNav } from './HeaderSideNav';
import { useActiveSection } from './useActiveSection';

export type HeaderProps = Record<string, never>;

export const Header: FC<HeaderProps> = () => {
  const [sideNavOpen, setSideNavOpen] = useState<boolean>(false);
  const siteDetails = useSiteDetails();
  const headerNavigationItems = siteDetails?.headerNavigationItems ?? [];
  const { cart, toggleCartDrawer } = useCart();
  const { actions: { toggleSearchDrawer } } = useStorefront();
  const { activeSection } = useActiveSection(headerNavigationItems);
  const rootLoader = useRootLoaderData();
  const hasProducts = rootLoader?.hasPublishedProducts;
  const location = useLocation();
  const isCheckout = location.pathname.startsWith('/checkout');
  const checkoutIconClassName = isCheckout
    ? 'text-primary-50 border-primary-200/40 hover:!bg-primary-500/10 focus:!bg-primary-500/10 focus-within:!bg-primary-500/10'
    : undefined;

  return (
    <header className="sticky top-0 z-40 mkt-header text-primary-50 bg-highlight-50/80 backdrop-blur border-b border-primary-900/10">
      <nav aria-label="Top">
        <div className="bg-transparent">
          <div className="">
            <Container>
              {hasProducts && (
                <div className="-mb-2 flex w-full items-center justify-end gap-4 pt-2 sm:hidden">
                  {!!cart && (
                    <IconButton
                      aria-label="open shopping cart"
                      className={clsx('text-white sm:mr-0.5', checkoutIconClassName)}
                      icon={(iconProps) => (
                        <div className="relative">
                          <ShoppingBagIcon
                            {...iconProps}
                            className={clsx(iconProps.className, 'hover:!bg-primary-50 focus:!bg-primary-50')}
                          />
                          {cart.items && cart.items.length > 0 && (
                            <span className="bg-primary-500 absolute -top-1 left-full -ml-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-xs font-bold text-white">
                              <span>
                                {cart.items.reduce((acc, item) => acc + item.quantity, 0)}{' '}
                                <span className="sr-only">items in cart, view bag</span>
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      onClick={() => toggleCartDrawer(true)}
                    />
                  )}

                  <div className="flex-auto" />
                </div>
              )}

              <div
                className={clsx(
                  'h-[var(--mkt-header-height)] flex sm:h-[var(--mkt-header-height-desktop)] flex-nowrap items-center justify-between gap-2 py-2',
                )}
              >
                <LogoStoreName className="h-6 sm:h-8" primary theme="dark" />
                  <div className="flex flex-wrap-reverse items-center gap-x-6 sm:justify-end">
                  {headerNavigationItems && (
                    <div className="hidden h-full gap-6 md:flex">
                       {headerNavigationItems.slice(0, 6).map(({ id, new_tab, ...navItemProps }) => (
                        <URLAwareNavLink
                          key={id}
                          {...navItemProps}
                          newTab={new_tab}
                          className={({ isActive }) =>
                            clsx('my-4 flex items-center whitespace-nowrap text-base font-normal', {
                              'hover:underline': !isActive,
                              'border-b-primary-200 border-b-2':
                                isActive &&
                                (!navItemProps.url.includes('#') ||
                                  activeSection === navItemProps.url.split('#')[1].split('?')[0]),
                            })
                          }
                          prefetch="viewport"
                        >
                          {navItemProps.label}
                        </URLAwareNavLink>
                      ))}
                    </div>
                  )}

                    <div className="flex items-center justify-end">
                      <URLAwareNavLink
                        url="/account"
                        className={({ isActive }) =>
                          clsx('hidden sm:inline-flex items-center text-base font-normal mr-4 lg:mr-6', {
                            'hover:underline': !isActive,
                            'border-b-primary-200 border-b-2': isActive,
                          })
                        }
                      >
                        Account
                      </URLAwareNavLink>
                    <div className="flex items-center gap-x-3 text-sm">
                        <IconButton
                          aria-label="search"
                          className={clsx(
                            'text-white hidden sm:mr-0.5 sm:inline-flex focus-within:!bg-primary-50',
                            checkoutIconClassName,
                          )}
                          icon={MagnifyingGlassIcon}
                          onClick={() => toggleSearchDrawer(true)}
                        />
                        {!!cart && hasProducts && (
                          <IconButton
                            aria-label="open shopping cart"
                            className={clsx(
                              'text-white hidden sm:mr-0.5 sm:inline-flex focus-within:!bg-primary-50',
                              checkoutIconClassName,
                            )}
                            icon={(iconProps) => (
                              <div className="relative">
                                <ShoppingBagIcon
                                {...iconProps}
                                className={clsx(iconProps.className, 'hover:!bg-primary-50')}
                              />
                              {cart.items && cart.items.length > 0 && (
                                <span className="bg-primary-500 absolute -top-1 left-full -ml-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-xs font-bold text-white">
                                  <span>
                                    {cart.items.reduce((acc, item) => acc + item.quantity, 0)}{' '}
                                    <span className="sr-only">items in cart, view bag</span>
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                          onClick={() => toggleCartDrawer(true)}
                        />
                      )}
                      {(hasProducts || !!headerNavigationItems?.length) && (
                        <IconButton
                          aria-label="open navigation menu"
                          onClick={() => setSideNavOpen(true)}
                          className="hover:!bg-primary-50 focus:!bg-primary-50 sm:inline-flex text-white md:hidden"
                          icon={Bars3Icon}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Container>
          </div>
        </div>
      </nav>
      <HeaderSideNav activeSection={activeSection} open={sideNavOpen} setOpen={setSideNavOpen} />
    </header>
  );
};
