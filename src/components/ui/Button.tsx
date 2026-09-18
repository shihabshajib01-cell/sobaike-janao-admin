import React, {
  ButtonHTMLAttributes,
  HTMLAttributes,
  forwardRef,
} from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBaseStyles =
  'inline-flex items-center justify-center font-medium rounded-md transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

const buttonVariantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white border border-transparent shadow-sm dark:bg-sky-500 dark:hover:bg-sky-600 dark:active:bg-sky-700',
  secondary:
    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/70 active:bg-slate-100 dark:active:bg-slate-700 shadow-sm',
  ghost:
    'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 active:bg-slate-200/70 dark:active:bg-slate-800 border border-transparent shadow-none',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-transparent shadow-sm dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700',
  success:
    'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-transparent shadow-sm dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:active:bg-emerald-700',
  link:
    'bg-transparent text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 underline-offset-4 hover:underline border border-transparent shadow-none active:scale-100',
};

const buttonSizeStyles: Record<ButtonSize, string> = {
  sm: 'type-action-sm h-8 min-h-8 px-3 gap-1.5',
  md: 'type-action-sm h-10 min-h-10 px-4 gap-2',
  lg: 'type-action h-11 min-h-11 px-5 gap-2.5',
};

const buttonIconStyles: Record<ButtonSize, string> = {
  sm: '[&_svg]:size-3.5',
  md: '[&_svg]:size-4',
  lg: '[&_svg]:size-[18px]',
};

export interface ButtonBaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const ButtonBase = forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ type = 'button', className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-button-system="base"
      className={cn(
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

ButtonBase.displayName = 'ButtonBase';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      type = 'button',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      data-button-system="button"
      data-button-variant={variant}
      data-button-size={size}
      className={cn(
        buttonBaseStyles,
        buttonVariantStyles[variant],
        buttonSizeStyles[size],
        buttonIconStyles[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2
          className="animate-spin text-current shrink-0"
          aria-hidden="true"
        />
      ) : (
        leftIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}

      <span className="truncate">{children}</span>

      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  )
);

Button.displayName = 'Button';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: React.ReactNode;
  isLoading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      type = 'button',
      icon,
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const iconButtonSizeStyles: Record<ButtonSize, string> = {
      sm: 'size-8 min-w-8 min-h-8 p-0',
      md: 'size-10 min-w-10 min-h-10 p-0',
      lg: 'size-11 min-w-11 min-h-11 p-0',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        data-button-system="icon"
        data-button-variant={variant}
        data-button-size={size}
        className={cn(
          buttonBaseStyles,
          buttonVariantStyles[variant],
          iconButtonSizeStyles[size],
          buttonIconStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin text-current" aria-hidden="true" />
        ) : (
          <span className="inline-flex" aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export interface ActionGroupProps extends HTMLAttributes<HTMLDivElement> {
  stackOnMobile?: boolean;
  fullWidthOnMobile?: boolean;
}

export const ActionGroup: React.FC<ActionGroupProps> = ({
  className,
  stackOnMobile = true,
  fullWidthOnMobile = true,
  children,
  ...props
}) => (
  <div
    data-button-system="action-group"
    className={cn(
      'flex items-center justify-end gap-2',
      stackOnMobile && 'max-sm:flex-col-reverse max-sm:items-stretch',
      fullWidthOnMobile && 'max-sm:[&_[data-button-system="button"]]:w-full',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export default Button;
