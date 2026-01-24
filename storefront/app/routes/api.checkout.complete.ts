import { zodResolver } from '@hookform/resolvers/zod';
import { addressPayload, addressToMedusaAddress } from '@libs/util/addresses';
import { removeCartId } from '@libs/util/server/cookies.server';
import { initiatePaymentSession, placeOrder, retrieveCart, updateCart } from '@libs/util/server/data/cart.server';
import type { StoreCart } from '@medusajs/types';
import type { ActionFunctionArgs } from 'react-router';
import { redirect, data as remixData } from 'react-router';
import { getValidatedFormData } from 'remix-hook-form';
import { z } from 'zod';

const addressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  company: z.string().optional(),
  address1: z.string().min(1, 'Address is required').optional(),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required').optional(),
  province: z.string().min(1, 'Province is required').optional(),
  countryCode: z.string().min(1, 'Country is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  phone: z.string().optional(),
});

export const completeCheckoutSchema = z
  .object({
    cartId: z.string(),
    providerId: z.string(),
    sameAsShipping: z.boolean().optional(),
    billingAddress: z.any(),
    noRedirect: z.boolean().optional(),
    venmoContact: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.providerId.includes('venmo')) {
      const contact = data.venmoContact?.trim();
      if (!contact) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Venmo phone or email is required',
          path: ['venmoContact'],
        });
        return;
      }

      const isEmail = /.+@.+\..+/.test(contact);
      const digits = contact.replace(/\D/g, '');
      const isPhone = digits.length >= 7;

      if (!isEmail && !isPhone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid Venmo phone number or email',
          path: ['venmoContact'],
        });
      }
    }
  })
  .refine((data) => (data.sameAsShipping ? z.any() : addressSchema.safeParse(data.billingAddress).success), {
    message: 'Valid billing address is required when creating a new address',
    path: ['root'],
  });

export type CompleteCheckoutFormData = z.infer<typeof completeCheckoutSchema>;

export async function action(actionArgs: ActionFunctionArgs) {
  const { errors, data } = await getValidatedFormData<CompleteCheckoutFormData>(
    actionArgs.request,
    zodResolver(completeCheckoutSchema),
  );

  if (errors) {
    return remixData({ errors }, { status: 400 });
  }

  let cart = (await retrieveCart(actionArgs.request)) as StoreCart;

  const billingAddress = data.sameAsShipping ? cart.shipping_address : addressToMedusaAddress(data.billingAddress);

  cart = (
    await updateCart(actionArgs.request, {
      billing_address: addressPayload(billingAddress),
    })
  )?.cart;

  const activePaymentSession = cart.payment_collection?.payment_sessions?.find((ps) => ps.status === 'pending');

  const venmoContact = data.venmoContact?.trim();
  let paymentSessionData: Record<string, unknown> | undefined;

  if (venmoContact) {
    if (venmoContact.includes('@')) {
      paymentSessionData = { venmo_target: { email: venmoContact } };
    } else {
      const digits = venmoContact.replace(/\D/g, '');
      paymentSessionData = { venmo_target: { phone: digits || venmoContact } };
    }
  }

  const shouldInitiateSession =
    activePaymentSession?.provider_id !== data.providerId ||
    !cart.payment_collection?.payment_sessions?.length ||
    paymentSessionData;

  if (shouldInitiateSession) {
    await initiatePaymentSession(actionArgs.request, cart, {
      provider_id: data.providerId,
      ...(paymentSessionData ? { data: paymentSessionData } : {}),
    });
  }

  const cartResponse = await placeOrder(actionArgs.request);

  if (cartResponse.type === 'cart' || !cartResponse) {
    return remixData(
      { errors: { root: { message: 'Cart could not be completed. Please try again.' } } },
      { status: 400 },
    );
  }

  const headers = new Headers();
  await removeCartId(headers);

  const { order } = cartResponse;

  if (data.noRedirect) {
    return remixData({ order }, { headers });
  }

  throw redirect(`/checkout/success?order_id=${order.id}`, { headers });
}
