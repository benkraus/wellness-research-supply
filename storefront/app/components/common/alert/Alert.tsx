import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/solid/ExclamationTriangleIcon';
import InformationCircleIcon from '@heroicons/react/24/solid/InformationCircleIcon';
import XCircleIcon from '@heroicons/react/24/solid/XCircleIcon';
import { FC, HTMLAttributes } from 'react';

import clsx from 'clsx';

export type AlertAction = FC<HTMLAttributes<HTMLButtonElement | HTMLAnchorElement>>;

const alertClassNameMap = {
  default: {
    wrapper: 'bg-gray-100',
    icon: 'text-gray-400',
    title: 'text-gray-800',
    content: 'text-gray-700',
    action:
      'focus:ring-offset-2 bg-gray-50 text-gray-500 hover:bg-gray-100 focus:ring-offset-gray-50 focus:ring-gray-600',
  },
  success: {
    wrapper: 'bg-green-50',
    icon: 'text-green-400',
    title: 'text-green-800',
    content: 'text-green-700',
    action:
      'focus:ring-offset-2 bg-green-50 text-green-500 hover:bg-green-100 focus:ring-offset-green-50 focus:ring-green-600',
  },
  error: {
    wrapper: 'bg-red-50',
    icon: 'text-red-400',
    title: 'text-red-800',
    content: 'text-red-700',
    action: 'focus:ring-offset-2 bg-red-50 text-red-500 hover:bg-red-100 focus:ring-offset-red-50 focus:ring-red-600',
  },
  warning: {
    wrapper: 'bg-amber-50',
    icon: 'text-amber-400',
    title: 'text-amber-800',
    content: 'text-amber-700',
    action:
      'focus:ring-offset-2 bg-amber-50 text-amber-500 hover:bg-amber-100 focus:ring-offset-amber-50 focus:ring-amber-600',
  },
  info: {
    wrapper: 'bg-blue-50',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    content: 'text-blue-700',
    action:
      'focus:ring-offset-2 bg-green-50 text-green-500 hover:bg-green-100 focus:ring-offset-green-50 focus:ring-green-600',
  },
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  type: keyof typeof alertClassNameMap;
  title?: string;
  action?: AlertAction;
  className?: string;
  tone?: 'light' | 'dark';
}

export const Alert: FC<AlertProps> = ({ type, title, action, children, className, tone = 'light', ...props }) => {
  const iconMap = {
    default: InformationCircleIcon,
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
  };

  const darkAlertClassNameMap = {
    default: {
      wrapper: 'bg-highlight-100/90 border border-primary-900/40',
      icon: 'text-primary-200',
      title: 'text-primary-50',
      content: 'text-primary-200',
      action: 'focus:ring-offset-2 bg-highlight-100 text-primary-200 hover:bg-highlight-50/70 focus:ring-primary-500',
    },
    success: {
      wrapper: 'bg-emerald-500/10 border border-emerald-500/30',
      icon: 'text-emerald-300',
      title: 'text-emerald-100',
      content: 'text-emerald-200',
      action: 'focus:ring-offset-2 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 focus:ring-emerald-400',
    },
    error: {
      wrapper: 'bg-rose-500/10 border border-rose-500/30',
      icon: 'text-rose-300',
      title: 'text-rose-100',
      content: 'text-rose-200',
      action: 'focus:ring-offset-2 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 focus:ring-rose-400',
    },
    warning: {
      wrapper: 'bg-amber-500/10 border border-amber-500/30',
      icon: 'text-amber-300',
      title: 'text-amber-100',
      content: 'text-amber-200',
      action: 'focus:ring-offset-2 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 focus:ring-amber-400',
    },
    info: {
      wrapper: 'bg-sky-500/10 border border-sky-500/30',
      icon: 'text-sky-300',
      title: 'text-sky-100',
      content: 'text-sky-200',
      action: 'focus:ring-offset-2 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 focus:ring-sky-400',
    },
  } as typeof alertClassNameMap;

  const Icon = iconMap[type];
  const Action = action;

  const themeClasses = tone === 'dark' ? darkAlertClassNameMap : alertClassNameMap;

  return (
    <div className={clsx('@container rounded-md p-4', className, themeClasses[type].wrapper)} {...props}>
      <div className="@sm:flex-row flex flex-col">
        <div className="flex">
          <div className="flex-shrink-0">
            <Icon className={clsx('h-5 w-5', themeClasses[type].icon)} aria-hidden="true" />
          </div>
          <div className="ml-3">
            {title && <h3 className={clsx('text-sm font-bold', themeClasses[type].title)}>{title}</h3>}
            {children && (
              <div className={clsx('text-sm', themeClasses[type].content, { 'mt-1': !!title })}>{children}</div>
            )}
          </div>
        </div>

        {Action && (
          <div className="ml-auto pl-3">
            <div className="@sm:-mb-1.5 @sm:-mt-1.5 -mx-1.5 -mb-1.5 mt-1.5">
              <Action
                className={clsx(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2',
                  themeClasses[type].action,
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
