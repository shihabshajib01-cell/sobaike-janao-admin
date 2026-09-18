import React, { HTMLAttributes } from 'react';
import { cn } from '@/utils';

export interface ResponsiveDataViewProps extends HTMLAttributes<HTMLDivElement> {}

export const ResponsiveDataView: React.FC<ResponsiveDataViewProps> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('responsive-data-view w-full max-w-full min-w-0', className)}
    {...props}
  >
    {children}
  </div>
);

export const ResponsiveDataTableView: React.FC<ResponsiveDataViewProps> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('responsive-data-view__table w-full max-w-full min-w-0', className)}
    {...props}
  >
    {children}
  </div>
);

export const ResponsiveDataCardView: React.FC<ResponsiveDataViewProps> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('responsive-data-view__cards w-full max-w-full min-w-0', className)}
    {...props}
  >
    {children}
  </div>
);
