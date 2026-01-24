import { FC, PropsWithChildren } from 'react';
import { CompleteCheckoutForm } from '../CompleteCheckoutForm';

export interface ManualPaymentProps extends PropsWithChildren {
  isActiveStep: boolean;
  providerId: string;
}

export const ManualPayment: FC<ManualPaymentProps> = ({ providerId, ...props }) => (
  <CompleteCheckoutForm
    providerId={providerId}
    id="TestPaymentForm"
    submitMessage="Place order"
    className="mt-4"
    {...props}
  >
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-900">
      <p className="text-sm font-semibold">Card payments are not accepted.</p>
      <p className="mt-1 text-sm">
        After you place your order, we’ll email payment instructions from orders@wellnessresearchsupply.com.
      </p>
    </div>
  </CompleteCheckoutForm>
);
