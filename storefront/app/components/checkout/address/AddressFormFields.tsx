import { StyledTextField } from '@app/components/common/remix-hook-form/forms/fields/StyledTextField';
import { applyPhoneInputFormatting } from '@libs/util';
import clsx from 'clsx';
import { useRemixFormContext } from 'remix-hook-form';

export interface AddressFormFieldsProps {
  prefix: 'shippingAddress' | 'billingAddress';
  countryOptions: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}

export const AddressFormFields = ({ prefix, countryOptions, className, disabled = false }: AddressFormFieldsProps) => {
  const { register } = useRemixFormContext();
  const { ref, ...countryField } = register(`${prefix}.countryCode` as const);
  const checkoutFieldClassName =
    '[&_label]:text-primary-200 [&_input]:!bg-highlight-100 [&_input]:text-primary-50 [&_input]:border-primary-900/40 [&_input]:placeholder:text-primary-200/70 [&_input]:focus:border-primary-400 [&_input]:focus:ring-primary-400/40 [&_input]:disabled:opacity-60 [&_input]:disabled:cursor-not-allowed [&_input:-webkit-autofill]:!shadow-[0_0_0_1000px_rgb(6_33_50)_inset] [&_input:-webkit-autofill]:!text-primary-50';

  return (
    <div className={clsx('grid gap-4 sm:grid-cols-2', className)}>
      <StyledTextField
        name={`${prefix}.firstName`}
        label="First name"
        placeholder="First name"
        className={checkoutFieldClassName}
        disabled={disabled}
      />
      <StyledTextField
        name={`${prefix}.lastName`}
        label="Last name"
        placeholder="Last name"
        className={checkoutFieldClassName}
        disabled={disabled}
      />

      <StyledTextField
        name={`${prefix}.company`}
        label="Company (optional)"
        placeholder="Company"
        className={checkoutFieldClassName}
        disabled={disabled}
      />
      <StyledTextField
        name={`${prefix}.phone`}
        label="Phone"
        required
        placeholder="Phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        onInput={(event) => applyPhoneInputFormatting(event.currentTarget)}
        className={checkoutFieldClassName}
        disabled={disabled}
      />

      <StyledTextField
        name={`${prefix}.address1`}
        label="Address"
        placeholder="Street address"
        className={clsx('sm:col-span-2', checkoutFieldClassName)}
        disabled={disabled}
      />
      <StyledTextField
        name={`${prefix}.address2`}
        label="Apartment, suite, etc."
        placeholder="Apartment, suite, etc."
        className={clsx('sm:col-span-2', checkoutFieldClassName)}
        disabled={disabled}
      />

      <StyledTextField
        name={`${prefix}.city`}
        label="City"
        placeholder="City"
        className={checkoutFieldClassName}
        disabled={disabled}
      />
      <StyledTextField
        name={`${prefix}.province`}
        label="State / Province"
        placeholder="State / Province"
        className={checkoutFieldClassName}
        disabled={disabled}
      />

      <StyledTextField
        name={`${prefix}.postalCode`}
        label="Postal code"
        placeholder="Postal code"
        className={checkoutFieldClassName}
        disabled={disabled}
      />

      <div className="flex flex-col gap-2">
        <label className="text-[16px] text-primary-200" htmlFor={`${prefix}.countryCode`}>
          Country
        </label>
        <select
          id={`${prefix}.countryCode`}
          {...countryField}
          ref={ref}
          disabled={disabled}
          className={clsx(
            'focus:ring-primary-400/40 focus:border-primary-400 block h-12 w-full cursor-pointer rounded-md border border-primary-900/40 bg-highlight-100 pl-3 pr-10 text-sm text-primary-50 shadow-sm outline-none focus:ring-1',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <option value="">Select a country</option>
          {countryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
