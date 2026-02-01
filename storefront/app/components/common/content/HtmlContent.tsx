/* eslint-disable react/no-danger */
import clsx from 'clsx';
import type { FC, HTMLAttributes } from 'react';

export interface HtmlContentProps extends HTMLAttributes<HTMLDivElement> {
  html: string;
}

export const HtmlContent: FC<HtmlContentProps> = ({ html, className, ...props }) => {
  // biome-ignore lint: HTML content provided by CMS/Medusa
  return <div {...props} className={clsx(className)} dangerouslySetInnerHTML={{ __html: html }} />;
};
