import { CheckoutFlow } from '@app/components/checkout/CheckoutFlow';
import { CheckoutSidebar } from '@app/components/checkout/CheckoutSidebar';
import { Empty } from '@app/components/common/Empty/Empty';
import { Button } from '@app/components/common/buttons/Button';
import { getPosthog } from '@app/lib/posthog';
import { CheckoutProvider } from '@app/providers/checkout-provider';
import ShoppingCartIcon from '@heroicons/react/24/outline/ShoppingCartIcon';
import { sdk } from '@libs/util/server/client.server';
import { getCartId, removeCartId } from '@libs/util/server/cookies.server';
import { initiatePaymentSession, retrieveCart, setShippingMethod } from '@libs/util/server/data/cart.server';
import { getCustomer } from '@libs/util/server/data/customer.server';
import { listCartPaymentProviders } from '@libs/util/server/data/payment.server';
import { normalizePhoneNumber } from '@libs/util/phoneNumber';
import type { StoreCart, StoreCartShippingOption, StorePaymentProvider } from '@medusajs/types';
import type { BasePaymentSession } from '@medusajs/types/dist/http/payment/common';
import { useEffect, useRef } from 'react';
import { Link, redirect, useLoaderData, type LoaderFunctionArgs } from 'react-router';

const SYSTEM_PROVIDER_ID = 'pp_system_default';

const fetchShippingOptions = async (cartId: string) => {
  if (!cartId) return [];

  try {
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: cartId,
    });
    return shipping_options;
  } catch (e) {
    console.error(e);
    return [];
  }
};

const findCheapestShippingOption = (shippingOptions: StoreCartShippingOption[]) => {
  return shippingOptions.reduce((cheapest, current) => {
    return cheapest.amount <= current.amount ? cheapest : current;
  }, shippingOptions[0]);
};

const ensureSelectedCartShippingMethod = async (request: Request, cart: StoreCart) => {
  const selectedShippingMethod = cart.shipping_methods?.[0];

  if (selectedShippingMethod) return;

  const shippingOptions = await fetchShippingOptions(cart.id);

  const cheapestShippingOption = findCheapestShippingOption(shippingOptions);

  if (cheapestShippingOption) {
    await setShippingMethod(request, { cartId: cart.id, shippingOptionId: cheapestShippingOption.id });
  }
};

const ensureCartPaymentSessions = async (request: Request, cart: StoreCart): Promise<BasePaymentSession | null> => {
  if (!cart) throw new Error('Cart was not provided.');

  let activeSession = cart.payment_collection?.payment_sessions?.find((session) => session.status === 'pending');

  if (!activeSession) {
    if (!cart.region_id) return activeSession ?? null;
    const paymentProviders = await listCartPaymentProviders(cart.region_id);
    if (!paymentProviders.length) return activeSession;

    const nonStripeProviders = paymentProviders.filter((p) => !p.id.includes('stripe'));
    const provider =
      nonStripeProviders.find((p) => p.id.includes('venmo')) ??
      nonStripeProviders.find((p) => p.id === SYSTEM_PROVIDER_ID) ??
      nonStripeProviders[0];

    if (!provider) return activeSession;

    const { payment_collection } = await initiatePaymentSession(request, cart, {
      provider_id: provider.id,
    });

    activeSession = payment_collection.payment_sessions?.find((session) => session.status === 'pending');
  }

  return activeSession ?? null;
};

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<{
  cart: StoreCart | null;
  shippingOptions: StoreCartShippingOption[];
  paymentProviders: StorePaymentProvider[];
  activePaymentSession: BasePaymentSession | null;
}> => {
  const cartId = await getCartId(request.headers);

  const customer = await getCustomer(request);
  if (!customer) {
    const redirectTo = new URL(request.url);
    const returnTo = `${redirectTo.pathname}${redirectTo.search}`;
    throw redirect(`/account?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (customer?.metadata?.email_verified === false) {
    const params = new URLSearchParams({
      email: customer.email,
      pending: '1',
    });
    throw redirect(`/account/verify-email?${params.toString()}`);
  }

  if (!cartId) {
    return {
      cart: null,
      shippingOptions: [],
      paymentProviders: [],
      activePaymentSession: null,
    };
  }

  const cart = await retrieveCart(request).catch(() => null);

  if (!cart) {
    throw redirect('/');
  }

  if ((cart as { completed_at?: string }).completed_at) {
    const headers = new Headers();
    await removeCartId(headers);

    throw redirect(`/`, { headers });
  }

  const shippingAddress = cart.shipping_address;
  const shippingPhone = shippingAddress?.phone ?? '';
  const hasPhone = !!normalizePhoneNumber(shippingPhone);
  const hasAddress = !!shippingAddress?.address_1 && !!shippingAddress?.city;

  if (hasPhone && hasAddress) {
    await ensureSelectedCartShippingMethod(request, cart);
  }

  const regionId = cart.region_id;
  const [shippingOptions, paymentProviders, activePaymentSession] = await Promise.all([
    hasPhone && hasAddress ? fetchShippingOptions(cartId) : Promise.resolve([] as StoreCartShippingOption[]),
    regionId
      ? ((await listCartPaymentProviders(regionId)) as StorePaymentProvider[])
      : Promise.resolve([] as StorePaymentProvider[]),
    await ensureCartPaymentSessions(request, cart),
  ]);

  console.info(
    '[Checkout] shipping options timeline',
    shippingOptions.map((option) => ({
      id: option.id,
      name: option.name,
      price_type: option.price_type,
      amount: option.amount,
      calculated_amount: option.calculated_price?.calculated_amount,
      metadata: (option.calculated_price as Record<string, unknown> | undefined)?.metadata,
    })),
  );

  const updatedCart = await retrieveCart(request);

  return {
    cart: updatedCart,
    shippingOptions,
    paymentProviders,
    activePaymentSession,
  };
};

export default function CheckoutIndexRoute() {
  const { shippingOptions, paymentProviders, activePaymentSession, cart } = useLoaderData<typeof loader>();
  const lastTrackedCheckoutRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cart?.id) return;
    if (!cart.items?.length) return;

    const posthog = getPosthog();
    if (!posthog) return;
    if (lastTrackedCheckoutRef.current === cart.id) return;

    posthog.capture('checkout_started', {
      cart_id: cart.id,
      currency: cart.region?.currency_code,
      item_count: cart.items?.length ?? 0,
      value: cart.item_subtotal,
    });

    lastTrackedCheckoutRef.current = cart.id;
  }, [cart?.id, cart?.items?.length, cart?.item_subtotal, cart?.region?.currency_code]);

  if (!cart || !cart.items?.length)
    return (
      <Empty
        icon={ShoppingCartIcon}
        title="No items in your cart."
        description="Add items to your cart"
        action={
          <Button variant="primary" as={(buttonProps) => <Link to="/products" {...buttonProps} />}>
            Start shopping
          </Button>
        }
      />
    );

  return (
    <CheckoutProvider
      data={{
        cart: cart as StoreCart | null,
        activePaymentSession: activePaymentSession,
        shippingOptions: shippingOptions,
        paymentProviders: paymentProviders,
      }}
    >
      <section className="checkout-page">
        <div className="mx-auto max-w-2xl px-4 pb-8 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:max-w-7xl lg:px-8 lg:pb-24 lg:pt-16">
          <div className="lg:grid lg:grid-cols-[4fr_3fr] lg:gap-x-12 xl:gap-x-16">
            <CheckoutFlow />
            <CheckoutSidebar />
          </div>
        </div>
      </section>
    </CheckoutProvider>
  );
}
