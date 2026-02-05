import { Button } from "@app/components/common/buttons/Button";
import { useCustomer } from "@app/hooks/useCustomer";
import { StyledTextField } from "@app/components/common/remix-hook-form/forms/fields/StyledTextField";
import { applyPhoneInputFormatting } from "@libs/util";
import { Checkbox } from "@lambdacurry/forms/remix-hook-form";
import type { FC, PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRemixFormContext } from "remix-hook-form";
import { useFetcher } from "react-router";
import { CompleteCheckoutForm } from "../CompleteCheckoutForm";

type EdebitSavedMethod = {
  id: string;
  label?: string;
  bank_name?: string;
  account_last4?: string;
  routing_last4?: string;
  created_at?: string;
  is_default?: boolean;
};

export interface EdebitPaymentProps extends PropsWithChildren {
  isActiveStep: boolean;
  providerId: string;
  paymentMethodToggle?: React.ReactNode;
}

const EdebitPaymentFields = () => {
  const { customer } = useCustomer();
  const { register, setValue, watch } = useRemixFormContext();
  const methodsFetcher = useFetcher<{ methods?: EdebitSavedMethod[] }>();
  const [hasChosenMethod, setHasChosenMethod] = useState(false);
  const fieldClassName =
    "[&_input]:!bg-highlight-100/70 [&_input]:!border-primary-900/40 [&_input]:!text-primary-50 [&_input]:!shadow-none [&_label]:!text-primary-200";

  const savedMethodsFromCustomer = useMemo(() => {
    const metadata = (customer?.metadata ?? {}) as Record<string, unknown>;
    const methods = metadata.edebit_payment_methods;
    if (!Array.isArray(methods)) return [] as EdebitSavedMethod[];
    return methods as EdebitSavedMethod[];
  }, [customer?.metadata]);

  const [savedMethods, setSavedMethods] = useState<EdebitSavedMethod[]>(savedMethodsFromCustomer);

  useEffect(() => {
    setSavedMethods(savedMethodsFromCustomer);
  }, [savedMethodsFromCustomer]);

  useEffect(() => {
    if (methodsFetcher.data?.methods) {
      setSavedMethods(methodsFetcher.data.methods);
    }
  }, [methodsFetcher.data]);

  const selectedSavedId = watch("edebitSavedMethodId") as string | undefined;
  const isUsingSaved = Boolean(selectedSavedId);

  const selectedSaved = savedMethods.find((method) => method.id === selectedSavedId);
  const defaultSaved = savedMethods.find((method) => method.is_default);

  useEffect(() => {
    if (!hasChosenMethod && !selectedSavedId && defaultSaved?.id) {
      setValue("edebitSavedMethodId", defaultSaved.id);
    }
  }, [defaultSaved?.id, selectedSavedId, hasChosenMethod, setValue]);

  useEffect(() => {
    if (selectedSavedId && !selectedSaved) {
      setValue("edebitSavedMethodId", "");
      setHasChosenMethod(false);
    }
  }, [selectedSavedId, selectedSaved, setValue]);

  const handleMakeDefault = (methodId: string) => {
    methodsFetcher.submit(
      { action: "default", methodId },
      { method: "post", action: "/api/edebit/methods" },
    );
  };

  const handleDelete = (methodId: string) => {
    methodsFetcher.submit(
      { action: "delete", methodId },
      { method: "post", action: "/api/edebit/methods" },
    );
  };

  return (
    <>
      <div className="rounded-xl border border-primary-900/40 bg-highlight-100/80 p-4 text-primary-100">
        <p className="text-sm font-semibold">Pay with eDebit (ACH)</p>
        <p className="mt-1 text-sm">
          Enter the bank account details for the checking account you want to use. Your payment will
          be processed as an ACH draft.
        </p>
      </div>

      {savedMethods.length > 0 && (
        <div className="mt-4">
          <label className="text-[16px] text-primary-200" htmlFor="edebitSavedMethodId">
            Saved bank accounts
          </label>
          {(() => {
            const field = register("edebitSavedMethodId");
            return (
              <select
                id="edebitSavedMethodId"
                className="mt-2 block h-12 w-full cursor-pointer rounded-md border border-primary-900/40 bg-highlight-100 px-3 text-sm text-primary-50 shadow-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/40"
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  setHasChosenMethod(true);
                }}
              >
                <option value="">Use a new bank account</option>
                {savedMethods.map((method) => {
                  const label =
                    method.label ||
                    [method.bank_name, method.account_last4 ? `•••• ${method.account_last4}` : null]
                      .filter(Boolean)
                      .join(" ");
                  const suffix = method.is_default ? " (default)" : "";
                  return (
                    <option key={method.id} value={method.id}>
                      {(label || method.id) + suffix}
                    </option>
                  );
                })}
              </select>
            );
          })()}
        </div>
      )}

      {isUsingSaved && selectedSaved && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
          <p className="text-sm font-semibold">Using saved account</p>
          <p className="mt-1 text-sm">
            {selectedSaved.label || selectedSaved.bank_name}{" "}
            {selectedSaved.account_last4 ? `•••• ${selectedSaved.account_last4}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {!selectedSaved.is_default && (
              <Button
                type="button"
                variant="link"
                size="sm"
                disabled={methodsFetcher.state !== "idle"}
                onClick={() => handleMakeDefault(selectedSaved.id)}
              >
                Make default
              </Button>
            )}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-red-600 hover:text-red-500"
              disabled={methodsFetcher.state !== "idle"}
              onClick={() => handleDelete(selectedSaved.id)}
            >
              Remove
            </Button>
          </div>
        </div>
      )}

      {!isUsingSaved && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StyledTextField
              name="edebitAccountName"
              label="Account holder name"
              placeholder="Full name on the account"
              className={`sm:col-span-2 ${fieldClassName}`}
            />

            <StyledTextField
              name="edebitBankName"
              label="Bank name"
              placeholder="Bank name"
              className={`sm:col-span-2 ${fieldClassName}`}
            />

            <StyledTextField
              name="edebitRoutingNumber"
              label="Routing number"
              placeholder="9-digit routing number"
              inputMode="numeric"
              autoComplete="off"
              className={fieldClassName}
            />

            <StyledTextField
              name="edebitAccountNumber"
              label="Account number"
              placeholder="Checking account number"
              inputMode="numeric"
              autoComplete="off"
              className={fieldClassName}
            />

            <StyledTextField
              name="edebitPhone"
              label="Account phone"
              placeholder="Phone number tied to the account"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={`sm:col-span-2 ${fieldClassName}`}
              onInput={(event) => applyPhoneInputFormatting(event.currentTarget)}
            />
          </div>

          {customer?.id ? (
            <div className="mt-4">
              <Checkbox name="edebitSaveMethod" label="Save this bank account for future orders" />
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Sign in to save bank accounts for future orders.</p>
          )}
        </>
      )}
    </>
  );
};

export const EdebitPayment: FC<EdebitPaymentProps> = ({ providerId, paymentMethodToggle, ...props }) => (
  <CompleteCheckoutForm
    providerId={providerId}
    id="EdebitPaymentForm"
    submitMessage="Submit eDebit Payment"
    className="mt-4"
    paymentMethodToggle={paymentMethodToggle}
    {...props}
  >
    <EdebitPaymentFields />
  </CompleteCheckoutForm>
);
