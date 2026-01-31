import { StyledTextField } from '@app/components/common/remix-hook-form/forms/fields/StyledTextField';
import { applyPhoneInputFormatting } from '@libs/util';
import clsx from 'clsx';
import { useRemixFormContext } from 'remix-hook-form';

export interface AddressFormFieldsProps {
  prefix: 'shippingAddress' | 'billingAddress';
  countryOptions: { value: string; label: string }[];
  className?: string;
}

export const AddressFormFields = ({ prefix, countryOptions, className }: AddressFormFieldsProps) => {
  const { register } = useRemixFormContext();
  const { ref, ...countryField } = register(`${prefix}.countryCode` as const);

  return (
    <div className={clsx('grid gap-4 sm:grid-cols-2', className)}>
      <StyledTextField name={`${prefix}.firstName`} label="First name" placeholder="First name" />
      <StyledTextField name={`${prefix}.lastName`} label="Last name" placeholder="Last name" />

      <StyledTextField name={`${prefix}.company`} label="Company (optional)" placeholder="Company" />
      <StyledTextField
        name={`${prefix}.phone`}
        label="Phone"
        required
        placeholder="Phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        onInput={(event) => applyPhoneInputFormatting(event.currentTarget)}
      />

      <StyledTextField
        name={`${prefix}.address1`}
        label="Address"
        placeholder="Street address"
        className="sm:col-span-2"
      />
      <StyledTextField
        name={`${prefix}.address2`}
        label="Apartment, suite, etc."
        placeholder="Apartment, suite, etc."
        className="sm:col-span-2"
      />

      <StyledTextField name={`${prefix}.city`} label="City" placeholder="City" />
      <StyledTextField name={`${prefix}.province`} label="State / Province" placeholder="State / Province" />

      <StyledTextField name={`${prefix}.postalCode`} label="Postal code" placeholder="Postal code" />

      <div className="flex flex-col gap-2">
        <label className="text-[16px] text-gray-600" htmlFor={`${prefix}.countryCode`}>
          Country
        </label>
        <select
          id={`${prefix}.countryCode`}
          {...countryField}
          ref={ref}
          className="focus:ring-primary-500 focus:border-primary-500 block h-12 w-full cursor-pointer rounded-md border border-gray-300 pl-3 pr-10 text-sm shadow-sm outline-none focus:ring-1"
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
