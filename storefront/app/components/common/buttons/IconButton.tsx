import clsx from 'clsx';
import { FC, JSXElementConstructor, SVGAttributes } from 'react';
import { ButtonBase, ButtonBaseProps } from './ButtonBase';

export interface IconButtonProps extends ButtonBaseProps {
  icon: JSXElementConstructor<any>;
  iconProps?: SVGAttributes<SVGElement>;
}

export const IconButton: FC<IconButtonProps> = ({ icon: Icon, className, iconProps, ...props }) => (
  <ButtonBase
    className={clsx(
      'icon-button inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-primary-200/20 text-primary-200 placeholder:bg-transparent hover:bg-highlight-100/60 hover:text-primary-50 focus:text-primary-50',
      className,
    )}
    {...props}
  >
    <Icon {...iconProps} className={clsx(iconProps?.className, 'h-6 w-6 text-current')} />
  </ButtonBase>
);
