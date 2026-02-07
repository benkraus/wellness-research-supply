import { CheckoutFlow } from '@app/components/checkout/CheckoutFlow';
import { CheckoutSidebar } from '@app/components/checkout/CheckoutSidebar';
import { Empty } from '@app/components/common/Empty/Empty';
import { Button } from '@app/components/common/buttons/Button';
import { getPosthog } from '@app/lib/posthog';
import { CheckoutProvider } from '@app/providers/checkout-provider';
import ShoppingCartIcon from '@heroicons/react/24/outline/ShoppingCartIcon';
import { sdk } from '@libs/util/server/client.server';
import { getMedusaBaseUrl, getPublishableKey } from '@libs/util/server/client.server';
import { getCartId, removeCartId } from '@libs/util/server/cookies.server';
import { initiatePaymentSession, retrieveCart, setShippingMethod } from '@libs/util/server/data/cart.server';
import { getCustomer } from '@libs/util/server/data/customer.server';
import { listCartPaymentProviders } from '@libs/util/server/data/payment.server';
import { normalizePhoneNumber } from '@libs/util/phoneNumber';
import { getShippingOptionAmount } from '@libs/util/checkout';
import type { StoreCart, StoreCartShippingOption, StorePaymentProvider } from '@medusajs/types';
import type { BasePaymentSession } from '@medusajs/types/dist/http/payment/common';
import { useEffect, useRef } from 'react';
import { Link, redirect, useLoaderData, type LoaderFunctionArgs } from 'react-router';

const SYSTEM_PROVIDER_ID = 'pp_system_default';
const SHIPPING_TIMELINE_OPTIONS_LIMIT = 10;
const SHIPPING_OPTIONS_PER_PROFILE_LIMIT = 30;
const SHIPPING_OPTIONS_TOTAL_LIMIT = 120;

const compactShippingOptionForClient = (option: StoreCartShippingOption): StoreCartShippingOption => {
  const data = (option.data && typeof option.data === 'object') ? (option.data as Record<string, unknown>) : null;
  const deliveryTimeline = data ? (data.delivery_timeline as unknown) : null;

  // Only keep the bits of data the UI/server code relies on. This keeps loader payloads small and avoids
  // browser OOM/crashes when Medusa returns a large shipping option list.
  const compactData =
    data
      ? {
          carrier_id: data.carrier_id,
          carrier_service_code: data.carrier_service_code,
          ...(deliveryTimeline ? { delivery_timeline: deliveryTimeline } : {}),
        }
      : undefined;

  return {
    id: option.id,
    name: option.name,
    price_type: option.price_type,
    amount: option.amount,
    calculated_price: option.calculated_price,
    shipping_profile_id: option.shipping_profile_id,
    data: compactData,
  } as unknown as StoreCartShippingOption;
};

const limitShippingOptionsForClient = (
  options: StoreCartShippingOption[],
  selectedOptionIds: string[],
): StoreCartShippingOption[] => {
  const byProfile = options.reduce<Record<string, StoreCartShippingOption[]>>((acc, option) => {
    const profileId = option.shipping_profile_id;
    if (!profileId) return acc;
    if (!acc[profileId]) acc[profileId] = [];
    acc[profileId].push(option);
    return acc;
  }, {});

  const limited: StoreCartShippingOption[] = [];
  Object.values(byProfile).forEach((profileOptions) => {
    const sorted = [...profileOptions].sort((a, b) => getShippingOptionAmount(a) - getShippingOptionAmount(b));
    limited.push(...sorted.slice(0, SHIPPING_OPTIONS_PER_PROFILE_LIMIT));
  });

  // Always include selected options, even if they'd be cut off by the limit.
  const seen = new Set(limited.map((o) => o.id));
  selectedOptionIds.forEach((id) => {
    if (seen.has(id)) return;
    const match = options.find((o) => o.id === id);
    if (!match) return;
    seen.add(id);
    limited.push(match);
  });

  if (limited.length <= SHIPPING_OPTIONS_TOTAL_LIMIT) return limited;

  const selectedSet = new Set(selectedOptionIds);
  const selected = limited.filter((o) => selectedSet.has(o.id));
  const rest = limited.filter((o) => !selectedSet.has(o.id));
  rest.sort((a, b) => getShippingOptionAmount(a) - getShippingOptionAmount(b));

  const remainingSlots = Math.max(0, SHIPPING_OPTIONS_TOTAL_LIMIT - selected.length);
  return [...selected, ...rest.slice(0, remainingSlots)];
};

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
  if (!shippingOptions.length) return null;

  return shippingOptions.reduce((cheapest, current) => {
    return getShippingOptionAmount(current) < getShippingOptionAmount(cheapest) ? current : cheapest;
  }, shippingOptions[0]);
};

const ensureSelectedCartShippingMethod = async (
  request: Request,
  cart: StoreCart,
  shippingOptions: StoreCartShippingOption[],
) => {
  const selectedShippingMethod = cart.shipping_methods?.[0];

  if (selectedShippingMethod) return;

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

  // Avoid calling shipping option calculation endpoints multiple times per request.
  const rawShippingOptions = hasPhone && hasAddress ? await fetchShippingOptions(cartId) : ([] as StoreCartShippingOption[]);

  if (hasPhone && hasAddress) {
    await ensureSelectedCartShippingMethod(request, cart, rawShippingOptions);
  }

  // Re-retrieve cart so shipping_methods set above are reflected and we can keep the selected option even if we cap.
  const updatedCart = await retrieveCart(request);

  const regionId = updatedCart.region_id;
  const [paymentProviders, activePaymentSession] = await Promise.all([
    regionId
      ? ((await listCartPaymentProviders(regionId)) as StorePaymentProvider[])
      : Promise.resolve([] as StorePaymentProvider[]),
    await ensureCartPaymentSessions(request, updatedCart),
  ]);

  const selectedShippingOptionIds =
    updatedCart.shipping_methods
      ?.map((m) => m.shipping_option_id)
      .filter((id): id is string => Boolean(id)) ?? [];

  const shippingOptions = hasPhone && hasAddress
    ? limitShippingOptionsForClient(rawShippingOptions, selectedShippingOptionIds).map(compactShippingOptionForClient)
    : ([] as StoreCartShippingOption[]);

  if (process.env.CHECKOUT_DEBUG === 'true') {
    console.info('[Checkout] shipping options payload', {
      raw_count: rawShippingOptions.length,
      selected_count: selectedShippingOptionIds.length,
      client_count: shippingOptions.length,
    });
  }

  let shippingOptionsWithTimeline = shippingOptions;

  if (shippingOptions.length > 0 && hasPhone && hasAddress) {
    const publishableKey = await getPublishableKey();
    const baseUrl = getMedusaBaseUrl();
    const timelineUrl = new URL('/store/shipping-options/timeline', baseUrl);

    const timelineCandidates = [...shippingOptions]
      .sort((a, b) => getShippingOptionAmount(a) - getShippingOptionAmount(b))
      .slice(0, SHIPPING_TIMELINE_OPTIONS_LIMIT);

    const timelineResponse = await fetch(timelineUrl.toString(), {
      method: 'POST',
      headers: {
        ...(publishableKey ? { 'x-publishable-api-key': publishableKey } : {}),
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        cart_id: cartId,
        options: timelineCandidates.map((option) => ({
          id: option.id,
          data: option.data,
        })),
      }),
    });

    if (timelineResponse.ok) {
      const payload = (await timelineResponse.json()) as {
        timelines?: Record<string, { carrier_delivery_days?: string; delivery_days?: number; delivery_date?: string } | null>;
      };
      const timelines = payload?.timelines ?? {};
      shippingOptionsWithTimeline = shippingOptions.map((option) => {
        const timeline = timelines[option.id];
        if (!timeline) return option;
        const data = (option.data && typeof option.data === 'object') ? option.data : {};
        return {
          ...option,
          data: {
            ...data,
            delivery_timeline: timeline,
          },
        };
      });
    }
  }

  return {
    cart: updatedCart,
    shippingOptions: shippingOptionsWithTimeline,
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
