import type { PropsWithChildren } from 'react';
import { CompleteCheckoutForm } from '../CompleteCheckoutForm';

export interface ManualPaymentProps extends PropsWithChildren {
  isActiveStep: boolean;
  providerId: string;
}

export const ManualPayment = ({ providerId, ...props }: ManualPaymentProps) => (
  <CompleteCheckoutForm
    providerId={providerId}
    id="TestPaymentForm"
    submitMessage="Place order"
    className="mt-4"
    {...props}
  />
);
