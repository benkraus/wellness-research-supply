import { Button, ButtonProps } from '@app/components/common/buttons/Button';
import { FC, useEffect } from 'react';
import { useRemixFormContext } from 'remix-hook-form';

export interface SubmitButtonProps extends ButtonProps {}

export const SubmitButton: FC<SubmitButtonProps> = ({ children, ...props }) => {
  const { formState, trigger } = useRemixFormContext();
  const isDisabled =
    Boolean(props.disabled) ||
    formState.isSubmitting ||
    formState.isValidating ||
    formState.isValid === false;

  useEffect(() => {
    void trigger();
  }, [trigger]);

  return (
    <Button variant="primary" type="submit" disabled={isDisabled} {...props}>
      {children || (formState.isSubmitting ? 'Submitting...' : 'Submit')}
    </Button>
  );
};
