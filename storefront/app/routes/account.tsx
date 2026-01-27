import { AddressDisplay } from '@app/components/checkout/address/AddressDisplay';
import { Container } from '@app/components/common/container/Container';
import { Input } from '@app/components/common/forms/inputs/Input';
import { useCustomer } from '@app/hooks/useCustomer';
import { useRegion } from '@app/hooks/useRegion';
import { formatDate, formatPrice, medusaAddressToAddress } from '@libs/util';
import { getCustomer } from '@libs/util/server/data/customer.server';
import { listOrdersWithCount } from '@libs/util/server/data/orders.server';
import type { StoreOrder } from '@medusajs/types';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  Outlet,
  type LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useRevalidator,
} from 'react-router';

type AuthResponse = { success?: boolean; error?: string; email?: string; warning?: string };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = 10;

  if (url.pathname.startsWith('/account/verify-email')) {
    return { orders: [] as StoreOrder[], page, pageSize, totalPages: 1, totalCount: 0 };
  }

  const customer = await getCustomer(request);
  if (!customer) return { orders: [] as StoreOrder[], page, pageSize, totalPages: 1, totalCount: 0 };

  if (customer.metadata?.email_verified === false) {
    return { orders: [] as StoreOrder[], page, pageSize, totalPages: 1, totalCount: 0 };
  }

  try {
    const result = await listOrdersWithCount(request, pageSize, (page - 1) * pageSize);
    const totalCount = result?.count ?? 0;
    const totalPages = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
    return {
      orders: (result?.orders ?? []) as StoreOrder[],
      page,
      pageSize,
      totalPages,
      totalCount,
    };
  } catch {
    return { orders: [] as StoreOrder[], page, pageSize, totalPages: 1, totalCount: 0 };
  }
};

export const meta = () => [
  { title: 'Account | Wellness Research Supply' },
  {
    name: 'description',
    content: 'Manage your Wellness Research Supply account.',
  },
];

export default function AccountRoute() {
  const { customer } = useCustomer();
  const { orders, page, pageSize, totalPages, totalCount } = useLoaderData<typeof loader>();
  const { region } = useRegion();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<'login' | 'register'>('login');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const loginFetcher = useFetcher<AuthResponse>();
  const registerFetcher = useFetcher<AuthResponse>();
  const logoutFetcher = useFetcher<AuthResponse>();
  const profileFetcher = useFetcher<AuthResponse>();
  const emailFetcher = useFetcher<AuthResponse>();
  const passwordFetcher = useFetcher<AuthResponse>();
  const resendFetcher = useFetcher<AuthResponse>();
  const addressFetcher = useFetcher<AuthResponse>();
  const addressActionFetcher = useFetcher<AuthResponse>();
  const addressUpdateFetcher = useFetcher<AuthResponse>();

  const emailVerified = customer?.metadata?.email_verified !== false;

  const countryOptions = useMemo(
    () =>
      (region?.countries ?? []).map((country) => ({
        value: country.iso_2,
        label: country.display_name,
      })),
    [region?.countries],
  );

  const normalizedPath = location.pathname.replace(/\/$/, '');
  const isSubRoute = normalizedPath.startsWith('/account/') && normalizedPath !== '/account';

  useEffect(() => {
    if (isSubRoute || revalidator.state !== 'idle') {
      return;
    }
    if (
      loginFetcher.data?.success ||
      registerFetcher.data?.success ||
      logoutFetcher.data?.success ||
      profileFetcher.data?.success ||
      emailFetcher.data?.success ||
      passwordFetcher.data?.success ||
      resendFetcher.data?.success ||
      addressFetcher.data?.success ||
      addressActionFetcher.data?.success ||
      addressUpdateFetcher.data?.success
    ) {
      revalidator.revalidate();
    }
  }, [
    loginFetcher.data,
    registerFetcher.data,
    logoutFetcher.data,
    profileFetcher.data,
    emailFetcher.data,
    passwordFetcher.data,
    resendFetcher.data,
    addressFetcher.data,
    addressActionFetcher.data,
    addressUpdateFetcher.data,
    isSubRoute,
    revalidator,
  ]);

  useEffect(() => {
    if (registerFetcher.data?.success && registerFetcher.data?.email) {
      const params = new URLSearchParams({
        email: registerFetcher.data.email,
        pending: '1',
      });
      if (registerFetcher.data?.warning) {
        params.set('warning', '1');
      }
      navigate(`/account/verify-email?${params.toString()}`);
    }
  }, [navigate, registerFetcher.data?.email, registerFetcher.data?.success, registerFetcher.data?.warning]);

  useEffect(() => {
    if (emailFetcher.data?.success && emailFetcher.data?.email) {
      const params = new URLSearchParams({
        email: emailFetcher.data.email,
        pending: '1',
      });
      if (emailFetcher.data?.warning) {
        params.set('warning', '1');
      }
      navigate(`/account/verify-email?${params.toString()}`);
    }
  }, [emailFetcher.data?.email, emailFetcher.data?.success, emailFetcher.data?.warning, navigate]);

  useEffect(() => {
    if (addressUpdateFetcher.data?.success) {
      setEditingAddressId(null);
    }
  }, [addressUpdateFetcher.data?.success]);

  const addresses = customer?.addresses ?? [];

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="bg-highlight-50 py-12 sm:py-20 lg:py-24">
      <Container>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-primary-900/10 bg-highlight-100 p-6 sm:p-8 shadow-sm">
            {customer?.id ? (
              <div className="space-y-10">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <h1 className="text-3xl font-display font-bold text-primary-50">Account</h1>
                    <p className="text-primary-100 mt-2">{customer.email}</p>
                    <p className="mt-2 text-sm text-primary-200">
                      {emailVerified ? 'Email verified' : 'Email verification required'}
                    </p>
                  </div>

                  <logoutFetcher.Form method="post" action="/api/account/logout">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-primary-200/30 px-6 py-2 text-sm font-semibold text-primary-50 hover:bg-highlight-50"
                    >
                      Sign out
                    </button>
                  </logoutFetcher.Form>
                </div>

                {!emailVerified && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100">
                    <h2 className="text-lg font-semibold text-amber-100">Verify your email</h2>
                    <p className="mt-2 text-sm text-amber-100/80">
                      Check your inbox for a verification link. You’ll need to verify before accessing account
                      management and order history.
                    </p>
                    {resendFetcher.data?.error && (
                      <p className="mt-3 text-sm text-red-300">{resendFetcher.data.error}</p>
                    )}
                    {resendFetcher.data?.success ? (
                      <p className="mt-3 text-sm text-amber-100/90">Verification email sent.</p>
                    ) : (
                      <resendFetcher.Form method="post" action="/api/account/resend-verification" className="mt-4">
                        <button
                          type="submit"
                          className="rounded-full bg-amber-200 px-5 py-2 text-sm font-semibold text-amber-900"
                          disabled={resendFetcher.state !== 'idle'}
                        >
                          {resendFetcher.state !== 'idle' ? 'Sending…' : 'Resend verification email'}
                        </button>
                      </resendFetcher.Form>
                    )}
                  </div>
                )}

                {emailVerified && (
                  <>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-2xl border border-primary-900/10 bg-highlight-50 p-6">
                        <h2 className="text-lg font-semibold text-primary-50">Account details</h2>
                        <p className="mt-1 text-sm text-primary-200">Update your name and phone number.</p>
                        <profileFetcher.Form method="post" action="/api/account/update" className="mt-4 space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                              name="first_name"
                              type="text"
                              defaultValue={customer.first_name || ''}
                              placeholder="First name"
                              required
                              className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                            />
                            <Input
                              name="last_name"
                              type="text"
                              defaultValue={customer.last_name || ''}
                              placeholder="Last name"
                              required
                              className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                            />
                          </div>
                          <Input
                            name="phone"
                            type="tel"
                            defaultValue={customer.phone || ''}
                            placeholder="Phone (optional)"
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          {profileFetcher.data?.error && (
                            <p className="text-sm text-red-300">{profileFetcher.data.error}</p>
                          )}
                          {profileFetcher.data?.success && (
                            <p className="text-sm text-emerald-300">Account details updated.</p>
                          )}
                          <button
                            type="submit"
                            className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-700"
                            disabled={profileFetcher.state !== 'idle'}
                          >
                            {profileFetcher.state !== 'idle' ? 'Saving…' : 'Save changes'}
                          </button>
                        </profileFetcher.Form>

                        <emailFetcher.Form method="post" action="/api/account/update-email" className="mt-6 space-y-4">
                          <Input
                            name="email"
                            type="email"
                            placeholder="New email address"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <p className="text-xs text-primary-200">
                            Changing your email requires verification before you can manage your account again.
                          </p>
                          {emailFetcher.data?.error && (
                            <p className="text-sm text-red-300">{emailFetcher.data.error}</p>
                          )}
                          {emailFetcher.data?.success && (
                            <p className="text-sm text-emerald-300">Email updated. Check your inbox to verify.</p>
                          )}
                          <button
                            type="submit"
                            className="rounded-full border border-primary-200/30 px-6 py-2 text-sm font-semibold text-primary-50 hover:bg-highlight-50"
                            disabled={emailFetcher.state !== 'idle'}
                          >
                            {emailFetcher.state !== 'idle' ? 'Updating…' : 'Update email'}
                          </button>
                        </emailFetcher.Form>
                      </div>

                      <div className="rounded-2xl border border-primary-900/10 bg-highlight-50 p-6">
                        <h2 className="text-lg font-semibold text-primary-50">Change password</h2>
                        <p className="mt-1 text-sm text-primary-200">Update your password any time.</p>
                        <passwordFetcher.Form
                          method="post"
                          action="/api/account/change-password"
                          className="mt-4 space-y-4"
                        >
                          <Input
                            name="current_password"
                            type="password"
                            placeholder="Current password"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <Input
                            name="new_password"
                            type="password"
                            placeholder="New password"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <p className="text-xs text-primary-200">Use at least 10 characters.</p>
                          <Input
                            name="confirm_password"
                            type="password"
                            placeholder="Confirm new password"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          {passwordFetcher.data?.error && (
                            <p className="text-sm text-red-300">{passwordFetcher.data.error}</p>
                          )}
                          {passwordFetcher.data?.success && (
                            <p className="text-sm text-emerald-300">Password updated.</p>
                          )}
                          <button
                            type="submit"
                            className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-700"
                            disabled={passwordFetcher.state !== 'idle'}
                          >
                            {passwordFetcher.state !== 'idle' ? 'Updating…' : 'Update password'}
                          </button>
                        </passwordFetcher.Form>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-primary-900/10 bg-highlight-50 p-6">
                      <h2 className="text-lg font-semibold text-primary-50">Shipping addresses</h2>
                      <p className="mt-1 text-sm text-primary-200">
                        Manage saved addresses and your default shipping location.
                      </p>

                      <div className="mt-6 space-y-4">
                        {addresses.length === 0 && (
                          <p className="text-sm text-primary-200">No saved addresses yet.</p>
                        )}

                        {addresses.map((address) => {
                          const isDefault = customer.default_shipping_address_id === address.id;
                          const formattedAddress = medusaAddressToAddress(address);
                          const isEditing = editingAddressId === address.id;

                          return (
                            <div
                              key={address.id}
                              className={clsx(
                                'rounded-xl border p-4',
                                isDefault ? 'border-primary-400/40 bg-primary-900/10' : 'border-primary-900/10',
                              )}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <AddressDisplay address={formattedAddress} countryOptions={countryOptions} />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingAddressId(isEditing ? null : address.id)}
                                    className="rounded-full border border-primary-200/30 px-3 py-1 text-xs font-semibold text-primary-50"
                                  >
                                    {isEditing ? 'Cancel' : 'Edit'}
                                  </button>
                                  {isDefault ? (
                                    <span className="rounded-full bg-primary-600/20 px-3 py-1 text-xs font-semibold text-primary-50">
                                      Default
                                    </span>
                                  ) : (
                                    <addressActionFetcher.Form
                                      method="post"
                                      action="/api/account/addresses"
                                    >
                                      <input type="hidden" name="intent" value="set-default" />
                                      <input type="hidden" name="address_id" value={address.id} />
                                      <button
                                        type="submit"
                                        className="rounded-full border border-primary-200/30 px-3 py-1 text-xs font-semibold text-primary-50"
                                        disabled={addressActionFetcher.state !== 'idle'}
                                      >
                                        Make default
                                      </button>
                                    </addressActionFetcher.Form>
                                  )}
                                  <addressActionFetcher.Form method="post" action="/api/account/addresses">
                                    <input type="hidden" name="intent" value="delete" />
                                    <input type="hidden" name="address_id" value={address.id} />
                                    <button
                                      type="submit"
                                      className="rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200"
                                      disabled={addressActionFetcher.state !== 'idle'}
                                    >
                                      Remove
                                    </button>
                                  </addressActionFetcher.Form>
                                </div>
                              </div>

                              {isEditing && (
                                <div className="mt-6 rounded-xl border border-primary-900/10 bg-highlight-100 p-5">
                                  <h4 className="text-sm font-semibold text-primary-50">Edit address</h4>
                                  <addressUpdateFetcher.Form
                                    method="post"
                                    action="/api/account/addresses"
                                    className="mt-4 grid gap-4 sm:grid-cols-2"
                                  >
                                    <input type="hidden" name="intent" value="update" />
                                    <input type="hidden" name="address_id" value={address.id} />
                                    <Input
                                      name="address.firstName"
                                      type="text"
                                      placeholder="First name"
                                      defaultValue={address.first_name || ''}
                                      required
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                                    />
                                    <Input
                                      name="address.lastName"
                                      type="text"
                                      placeholder="Last name"
                                      defaultValue={address.last_name || ''}
                                      required
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                                    />
                                    <Input
                                      name="address.company"
                                      type="text"
                                      placeholder="Company (optional)"
                                      defaultValue={address.company || ''}
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                                    />
                                    <Input
                                      name="address.phone"
                                      type="tel"
                                      placeholder="Phone (optional)"
                                      defaultValue={address.phone || ''}
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                                    />
                                    <Input
                                      name="address.address1"
                                      type="text"
                                      placeholder="Address"
                                      defaultValue={address.address_1 || ''}
                                      required
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200 sm:col-span-2"
                                    />
                                    <Input
                                      name="address.address2"
                                      type="text"
                                      placeholder="Apartment, suite, etc."
                                      defaultValue={address.address_2 || ''}
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200 sm:col-span-2"
                                    />
                                    <Input
                                      name="address.city"
                                      type="text"
                                      placeholder="City"
                                      defaultValue={address.city || ''}
                                      required
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                                    />
                                    <Input
                                      name="address.province"
                                      type="text"
                                      placeholder="State / Province"
                                      defaultValue={address.province || ''}
                                      required
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                                    />
                                    <Input
                                      name="address.postalCode"
                                      type="text"
                                      placeholder="Postal code"
                                      defaultValue={address.postal_code || ''}
                                      required
                                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                                    />
                                    <div className="sm:col-span-1">
                                      <select
                                        name="address.countryCode"
                                        defaultValue={address.country_code || ''}
                                        required
                                        className="focus:ring-primary-500 focus:border-primary-500 block h-12 w-full cursor-pointer rounded-md border border-primary-900/20 bg-highlight-50 px-3 text-sm text-primary-50 shadow-sm outline-none focus:ring-1"
                                      >
                                        <option value="">Select a country</option>
                                        {countryOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
                                      <label className="inline-flex items-center gap-2 text-sm text-primary-200">
                                        <input type="checkbox" name="set_default" className="h-4 w-4" />
                                        Make this my default shipping address
                                      </label>
                                    </div>
                                    {addressUpdateFetcher.data?.error && (
                                      <p className="text-sm text-red-300 sm:col-span-2">
                                        {addressUpdateFetcher.data.error}
                                      </p>
                                    )}
                                    {addressUpdateFetcher.data?.success && (
                                      <p className="text-sm text-emerald-300 sm:col-span-2">Address updated.</p>
                                    )}
                                    <div className="sm:col-span-2">
                                      <button
                                        type="submit"
                                        className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-700"
                                        disabled={addressUpdateFetcher.state !== 'idle'}
                                      >
                                        {addressUpdateFetcher.state !== 'idle' ? 'Saving…' : 'Save changes'}
                                      </button>
                                    </div>
                                  </addressUpdateFetcher.Form>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-8 rounded-xl border border-primary-900/10 bg-highlight-100 p-6">
                        <h3 className="text-base font-semibold text-primary-50">Add a new address</h3>
                        <addressFetcher.Form
                          method="post"
                          action="/api/account/addresses"
                          className="mt-4 grid gap-4 sm:grid-cols-2"
                        >
                          <input type="hidden" name="intent" value="create" />
                          <Input
                            name="address.firstName"
                            type="text"
                            placeholder="First name"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <Input
                            name="address.lastName"
                            type="text"
                            placeholder="Last name"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <Input
                            name="address.company"
                            type="text"
                            placeholder="Company (optional)"
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <Input
                            name="address.phone"
                            type="tel"
                            placeholder="Phone (optional)"
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <Input
                            name="address.address1"
                            type="text"
                            placeholder="Address"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200 sm:col-span-2"
                          />
                          <Input
                            name="address.address2"
                            type="text"
                            placeholder="Apartment, suite, etc."
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200 sm:col-span-2"
                          />
                          <Input
                            name="address.city"
                            type="text"
                            placeholder="City"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <Input
                            name="address.province"
                            type="text"
                            placeholder="State / Province"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <Input
                            name="address.postalCode"
                            type="text"
                            placeholder="Postal code"
                            required
                            className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                          />
                          <div className="sm:col-span-1">
                            <select
                              name="address.countryCode"
                              defaultValue={region?.countries?.[0]?.iso_2 ?? ''}
                              required
                              className="focus:ring-primary-500 focus:border-primary-500 block h-12 w-full cursor-pointer rounded-md border border-primary-900/20 bg-highlight-50 px-3 text-sm text-primary-50 shadow-sm outline-none focus:ring-1"
                            >
                              <option value="">Select a country</option>
                              {countryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
                            <label className="inline-flex items-center gap-2 text-sm text-primary-200">
                              <input type="checkbox" name="set_default" className="h-4 w-4" />
                              Make this my default shipping address
                            </label>
                          </div>
                          {addressFetcher.data?.error && (
                            <p className="text-sm text-red-300 sm:col-span-2">{addressFetcher.data.error}</p>
                          )}
                          {addressFetcher.data?.success && (
                            <p className="text-sm text-emerald-300 sm:col-span-2">Address saved.</p>
                          )}
                          <div className="sm:col-span-2">
                            <button
                              type="submit"
                              className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-700"
                              disabled={addressFetcher.state !== 'idle'}
                            >
                              {addressFetcher.state !== 'idle' ? 'Saving…' : 'Save address'}
                            </button>
                          </div>
                        </addressFetcher.Form>
                      </div>
                    </div>

                  <div className="rounded-2xl border border-primary-900/10 bg-highlight-50 p-6">
                    <h2 className="text-lg font-semibold text-primary-50">Order history</h2>
                    <p className="mt-1 text-sm text-primary-200">Review your recent orders and totals.</p>

                      <div className="mt-6 space-y-4">
                        {orders.length === 0 && (
                          <p className="text-sm text-primary-200">
                            {totalCount === 0 ? 'No orders yet.' : 'No orders on this page.'}
                          </p>
                        )}
                        {orders.map((order) => (
                          <div key={order.id} className="rounded-xl border border-primary-900/10 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <p className="text-sm text-primary-200">Order #{order.display_id}</p>
                                <p className="text-primary-50 font-semibold">
                                  {formatDate(new Date(order.created_at as string))}
                                </p>
                                <p className="text-sm text-primary-200 capitalize">
                                  Status: {order.status?.replace('_', ' ') ?? 'processing'}
                                </p>
                                <Link
                                  to={`/account/orders/${order.id}`}
                                  className="mt-2 inline-flex text-sm font-semibold text-primary-200 hover:text-primary-50"
                                >
                                  View details
                                </Link>
                              </div>
                              <div className="text-right">
                                <p className="text-xs uppercase text-primary-200">Total</p>
                                <p className="text-primary-50 text-lg font-semibold">
                                  {formatPrice(order.total || 0, { currency: order.currency_code })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalCount > 0 && totalPages > 1 && (
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-primary-200">
                          <div>
                            Page {page} of {totalPages}
                          </div>
                          <div className="flex gap-3">
                            {page > 1 && (
                              <Link
                                to={`/account?page=${page - 1}`}
                                className="rounded-full border border-primary-200/30 px-4 py-2 text-primary-50"
                              >
                                Previous
                              </Link>
                            )}
                            {page < totalPages && (
                              <Link
                                to={`/account?page=${page + 1}`}
                                className="rounded-full border border-primary-200/30 px-4 py-2 text-primary-50"
                              >
                                Next
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-50">
                    {view === 'login' ? 'Sign in' : 'Create account'}
                  </h1>
                  <p className="text-primary-100 mt-2">Access your account and manage your research orders.</p>
                </div>

                <div className="flex gap-2 rounded-full bg-highlight-50 p-1 text-xs sm:text-sm">
                  <button
                    type="button"
                    className={clsx(
                      'flex-1 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-medium transition',
                      view === 'login' ? 'bg-primary-600 text-primary-900' : 'text-primary-100 hover:text-primary-50',
                    )}
                    onClick={() => setView('login')}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      'flex-1 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-medium transition',
                      view === 'register'
                        ? 'bg-primary-600 text-primary-900'
                        : 'text-primary-100 hover:text-primary-50',
                    )}
                    onClick={() => setView('register')}
                  >
                    Register
                  </button>
                </div>

                {view === 'login' ? (
                  <loginFetcher.Form method="post" action="/api/account/login" className="space-y-4">
                    <Input
                      name="email"
                      type="email"
                      placeholder="Email"
                      required
                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                    />
                    <Input
                      name="password"
                      type="password"
                      placeholder="Password"
                      required
                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                    />
                    {loginFetcher.data?.error && (
                      <p className="text-sm text-red-300">{loginFetcher.data.error}</p>
                    )}
                    <button
                      type="submit"
                      className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700"
                    >
                      Sign in
                    </button>
                    <div className="text-center">
                      <Link to="/account/forgot-password" className="text-sm text-primary-200 hover:text-primary-50">
                        Forgot password?
                      </Link>
                    </div>
                  </loginFetcher.Form>
                ) : (
                  <registerFetcher.Form method="post" action="/api/account/register" className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        name="first_name"
                        type="text"
                        placeholder="First name"
                        required
                        className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                      />
                      <Input
                        name="last_name"
                        type="text"
                        placeholder="Last name"
                        required
                        className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                      />
                    </div>
                    <Input
                      name="email"
                      type="email"
                      placeholder="Email"
                      required
                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                    />
                    <Input
                      name="phone"
                      type="tel"
                      placeholder="Phone (optional)"
                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                    />
                    <Input
                      name="password"
                      type="password"
                      placeholder="Password"
                      required
                      className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
                    />
                    {registerFetcher.data?.error && (
                      <p className="text-sm text-red-300">{registerFetcher.data.error}</p>
                    )}
                    <button
                      type="submit"
                      className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700"
                    >
                      Create account
                    </button>
                  </registerFetcher.Form>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
