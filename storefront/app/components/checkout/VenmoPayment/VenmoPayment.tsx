import { StyledTextField } from "@app/components/common/remix-hook-form/forms/fields/StyledTextField";
import type { FC, PropsWithChildren } from "react";
import { CompleteCheckoutForm } from "../CompleteCheckoutForm";

export interface VenmoPaymentProps extends PropsWithChildren {
  isActiveStep: boolean;
  providerId: string;
}

export const VenmoPayment: FC<VenmoPaymentProps> = ({ providerId, ...props }) => (
  <CompleteCheckoutForm
    providerId={providerId}
    id="VenmoPaymentForm"
    submitMessage="Request Venmo Payment"
    className="mt-4"
    {...props}
  >
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-900">
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
      />
    </div>
  </CompleteCheckoutForm>
);
