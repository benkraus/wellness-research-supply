import { StyledTextField } from "@app/components/common/remix-hook-form/forms/fields/StyledTextField";
import type { FC, PropsWithChildren } from "react";
import { CompleteCheckoutForm } from "../CompleteCheckoutForm";

export interface VenmoPaymentProps extends PropsWithChildren {
  isActiveStep: boolean;
  providerId: string;
  paymentMethodToggle?: React.ReactNode;
}

export const VenmoPayment: FC<VenmoPaymentProps> = ({ providerId, paymentMethodToggle, ...props }) => (
  <CompleteCheckoutForm
    providerId={providerId}
    id="VenmoPaymentForm"
    submitMessage="I'll pay with Venmo"
    className="mt-4"
    paymentMethodToggle={paymentMethodToggle}
    {...props}
  >
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
      <p className="text-sm font-semibold">Pay with Venmo</p>
      <p className="mt-1 text-sm">
        Enter the phone number, email, or username tied to your Venmo account. We’ll send a payment request.
      </p>
    </div>

    <div className="mt-4">
      <StyledTextField
        name="venmoContact"
        label="Venmo phone or email"
        placeholder="name@example.com, 480-555-1234, or @handle"
        className="[&_input]:!bg-highlight-100/70 [&_input]:!border-primary-900/40 [&_input]:!text-primary-50 [&_input]:!shadow-none [&_label]:!text-primary-200"
      />
    </div>
  </CompleteCheckoutForm>
);
