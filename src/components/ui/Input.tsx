import { ButtonBase } from '@/components/ui/Button';
import React, { InputHTMLAttributes, forwardRef, useId, useState } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';
import { cn } from '@/utils';
import { useLanguage } from '@/context/LanguageContext';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isSearch?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      isSearch = false,
      onClear,
      disabled,
      id,
      value,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const { language } = useLanguage();
    const isBn = language === 'bn';
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const inputId = id || `input-${generatedId.replace(/:/g, '')}`;
    const messageId = `${inputId}-message`;
    const describedBy = [ariaDescribedBy, error || helperText ? messageId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

    const isPasswordType = type === 'password';
    const computedType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="type-label font-medium text-slate-700 dark:text-slate-300 select-none flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center">
          {/* Left Icon or Search Icon */}
          {(isSearch || leftIcon) && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftIcon || (isSearch && <Search className="w-4 h-4" />)}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={computedType}
            value={value}
            disabled={disabled}
            aria-invalid={ariaInvalid ?? (error ? true : undefined)}
            aria-describedby={describedBy}
            className={cn(
              'w-full h-9 rounded-md border type-form-value transition-colors duration-150 font-normal',
              'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500',
              'disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 dark:border-slate-700',
              isSearch || leftIcon ? 'pl-9' : 'pl-3',
              isPasswordType || onClear || rightIcon ? 'pr-9' : 'pr-3',
              className
            )}
            {...props}
          />

          {/* Right actions: Clear button or Password reveal or Custom Right Icon */}
          {onClear && value && !disabled ? (
            <ButtonBase
              type="button"
              onClick={onClear}
              className="absolute right-2.5 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label={isBn ? 'ইনপুট মুছুন' : 'Clear input'}
            >
              <X className="w-3.5 h-3.5" />
            </ButtonBase>
          ) : isPasswordType ? (
            <ButtonBase
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label={showPassword
                ? (isBn ? 'পাসওয়ার্ড লুকান' : 'Hide password')
                : (isBn ? 'পাসওয়ার্ড দেখান' : 'Show password')}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </ButtonBase>
          ) : rightIcon ? (
            <div className="absolute right-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          ) : null}
        </div>

        {/* Error or Helper message */}
        {error ? (
          <p id={messageId} role="alert" className="type-helper font-medium text-red-600 dark:text-red-400">{error}</p>
        ) : helperText ? (
          <p id={messageId} className="type-helper text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
