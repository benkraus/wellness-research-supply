import clsx from 'clsx';
import { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string | null;
}

export const InputCheckbox = forwardRef<HTMLInputElement, InputCheckboxProps>(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    id={props.id || props.name}
    {...props}
    type="checkbox"
    className={clsx(
      'accent-primary-500 text-primary-500 focus:ring-primary-400 block h-5 w-5 rounded border border-primary-200/40 bg-highlight-50/80 shadow-sm focus:ring-2 focus:ring-offset-0',
      { 'border-red-600': !!error },
      className,
    )}
  />
));
