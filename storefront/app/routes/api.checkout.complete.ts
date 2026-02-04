import { randomUUID } from 'node:crypto';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressPayload, addressToMedusaAddress } from '@libs/util/addresses';
import { normalizePhoneNumber } from '@libs/util/phoneNumber';
import { removeCartId } from '@libs/util/server/cookies.server';
import { initiatePaymentSession, placeOrder, retrieveCart, updateCart } from '@libs/util/server/data/cart.server';
import { getCustomerWithSensitive, upsertEdebitSavedMethod } from '@libs/util/server/data/customer.server';
import type { StoreCart } from '@medusajs/types';
import { redirect, data as remixData, type ActionFunctionArgs } from 'react-router';
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
    edebitAccountName: z.string().optional(),
    edebitRoutingNumber: z.string().optional(),
    edebitAccountNumber: z.string().optional(),
    edebitBankName: z.string().optional(),
    edebitPhone: z.string().optional(),
    edebitSavedMethodId: z.string().optional(),
    edebitSaveMethod: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.providerId.includes('venmo')) {
      const contact = data.venmoContact?.trim();
      if (!contact) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Venmo contact is required',
          path: ['venmoContact'],
        });
        return;
      }

      const isEmail = /.+@.+\..+/.test(contact);
      const digits = contact.replace(/\D/g, '');
      const isPhone = digits.length >= 7;

      if (!isEmail && !isPhone && contact.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid Venmo email, phone number, or username',
          path: ['venmoContact'],
        });
      }
    }

    if (data.providerId.includes('edebit')) {
      const savedId = data.edebitSavedMethodId?.trim();
      if (savedId) {
        return;
      }

      const name = data.edebitAccountName?.trim();
      if (!name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account holder name is required',
          path: ['edebitAccountName'],
        });
      }

      const routingDigits = (data.edebitRoutingNumber ?? '').replace(/\D/g, '');
      if (routingDigits.length !== 9) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Routing number must be 9 digits',
          path: ['edebitRoutingNumber'],
        });
      }

      const accountDigits = (data.edebitAccountNumber ?? '').replace(/\D/g, '');
      if (accountDigits.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account number is required',
          path: ['edebitAccountNumber'],
        });
      }

      const bankName = data.edebitBankName?.trim();
      if (!bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank name is required',
          path: ['edebitBankName'],
        });
      }

      const phoneDigits = (data.edebitPhone ?? '').replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A valid phone number is required',
          path: ['edebitPhone'],
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

  const isAllowedProvider =
    data.providerId.includes('venmo') || data.providerId.includes('edebit');

  if (!isAllowedProvider) {
    return remixData(
      {
        errors: {
          root: {
            message:
              'Only Venmo and eDebit (ACH) payments are accepted. Please select a valid payment method.',
          },
        },
      },
      { status: 400 },
    );
  }

  let cart = (await retrieveCart(actionArgs.request)) as StoreCart;

  const billingAddress = data.sameAsShipping
    ? cart.shipping_address
    : addressToMedusaAddress({
        ...data.billingAddress,
        phone: normalizePhoneNumber(data.billingAddress.phone ?? '') ?? data.billingAddress.phone,
      });

  cart = (
    await updateCart(actionArgs.request, {
      billing_address: addressPayload(billingAddress),
    })
  )?.cart;

  const activePaymentSession = cart.payment_collection?.payment_sessions?.find((ps) => ps.status === 'pending');

  const venmoContact = data.venmoContact?.trim();
  let paymentSessionData: Record<string, unknown> | undefined;

  const isEdebit = data.providerId.includes('edebit');
  const savedMethodId = data.edebitSavedMethodId?.trim();

  if (venmoContact) {
    const isEmail = /.+@.+\..+/.test(venmoContact);
    const digits = venmoContact.replace(/\D/g, '');
    const isPhone = digits.length >= 7;

    if (isEmail) {
      paymentSessionData = { venmo_target: { email: venmoContact } };
    } else if (isPhone) {
      const normalizedVenmo = normalizePhoneNumber(venmoContact);
      paymentSessionData = { venmo_target: { phone: normalizedVenmo ?? venmoContact } };
    } else {
      const normalizedHandle = venmoContact.startsWith('@') ? venmoContact.slice(1) : venmoContact;
      paymentSessionData = { venmo_target: { user_id: normalizedHandle } };
    }
  }

  if (isEdebit && savedMethodId) {
    const customer = await getCustomerWithSensitive(actionArgs.request);
    const metadata = (customer?.metadata ?? {}) as Record<string, unknown>;
    const savedMethods = Array.isArray(metadata.edebit_payment_methods)
      ? (metadata.edebit_payment_methods as Array<Record<string, unknown>>)
      : [];

    const selected = savedMethods.find((method) => method.id === savedMethodId);
    const encrypted = selected?.encrypted as string | undefined;

    if (!encrypted) {
      return remixData(
        { errors: { root: { message: 'Saved bank account not found. Please select another method.' } } },
        { status: 400 },
      );
    }

    paymentSessionData = {
      ...(paymentSessionData ?? {}),
      edebit_encrypted: encrypted,
      edebit_account_last4: selected?.account_last4,
      edebit_routing_last4: selected?.routing_last4,
      edebit_email: cart.email,
      edebit_address1: billingAddress.address_1,
      edebit_address2: billingAddress.address_2,
      edebit_city: billingAddress.city,
      edebit_state: billingAddress.province,
      edebit_zip: billingAddress.postal_code,
      edebit_country: billingAddress.country_code,
      cart_id: cart.id,
    };
  }

  if (isEdebit && !savedMethodId) {
    const encryptionKey = process.env.EDEBIT_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return remixData(
        { errors: { root: { message: 'eDebit is not configured. Please contact support.' } } },
        { status: 400 },
      );
    }

    const phoneFallback =
      data.edebitPhone?.trim() ||
      billingAddress.phone ||
      cart.shipping_address?.phone ||
      '';

    const normalizeDigits = (value: string) => value.replace(/\D/g, '');

    const edebitPayload = {
      account_name: data.edebitAccountName?.trim() ?? '',
      routing_number: normalizeDigits(data.edebitRoutingNumber ?? ''),
      account_number: normalizeDigits(data.edebitAccountNumber ?? ''),
      bank_name: data.edebitBankName?.trim() ?? '',
      phone: phoneFallback,
    };

    const { encryptEdebitPayload } = await import('@libs/util/server/edebit-encryption.server');
    const encrypted = encryptEdebitPayload(edebitPayload, encryptionKey);

    paymentSessionData = {
      ...(paymentSessionData ?? {}),
      edebit_encrypted: encrypted,
      edebit_account_last4: edebitPayload.account_number.slice(-4),
      edebit_routing_last4: edebitPayload.routing_number.slice(-4),
      edebit_email: cart.email,
      edebit_address1: billingAddress.address_1,
      edebit_address2: billingAddress.address_2,
      edebit_city: billingAddress.city,
      edebit_state: billingAddress.province,
      edebit_zip: billingAddress.postal_code,
      edebit_country: billingAddress.country_code,
      cart_id: cart.id,
    };

    if (data.edebitSaveMethod) {
      const customer = await getCustomerWithSensitive(actionArgs.request);
      if (!customer?.id) {
        return remixData(
          { errors: { root: { message: 'Sign in to save bank accounts for future orders.' } } },
          { status: 400 },
        );
      }

      const customerMetadata = (customer.metadata ?? {}) as Record<string, unknown>;
      const existingMethods = Array.isArray(customerMetadata.edebit_payment_methods)
        ? (customerMetadata.edebit_payment_methods as Array<Record<string, unknown>>)
        : [];

      const hasDefault = existingMethods.some((method) => method.is_default === true);

      const savedMethod = {
        id: randomUUID(),
        label: [edebitPayload.bank_name, `•••• ${edebitPayload.account_number.slice(-4)}`]
          .filter(Boolean)
          .join(' '),
        bank_name: edebitPayload.bank_name,
        account_last4: edebitPayload.account_number.slice(-4),
        routing_last4: edebitPayload.routing_number.slice(-4),
        encrypted,
        created_at: new Date().toISOString(),
        is_default: !hasDefault,
      };

      await upsertEdebitSavedMethod(actionArgs.request, savedMethod);
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
