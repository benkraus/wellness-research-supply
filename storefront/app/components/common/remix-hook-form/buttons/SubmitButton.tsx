import { Button, ButtonProps } from '@app/components/common/buttons/Button';
import { FC, useEffect, useRef } from 'react';
import { useRemixFormContext } from 'remix-hook-form';

export interface SubmitButtonProps extends ButtonProps {}

export const SubmitButton: FC<SubmitButtonProps> = ({ children, ...props }) => {
  const { formState, trigger } = useRemixFormContext();
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;
  const isDisabled =
    Boolean(props.disabled) ||
    formState.isSubmitting ||
    formState.isValidating ||
    formState.isValid === false;

  useEffect(() => {
    // Run initial validation once so `isValid` reflects prefilled default values.
    // Keep the effect dependency-free to avoid render loops when `trigger` is referentially unstable.
    void triggerRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Button variant="primary" type="submit" disabled={isDisabled} {...props}>
      {children || (formState.isSubmitting ? 'Submitting...' : 'Submit')}
    </Button>
  );
};
