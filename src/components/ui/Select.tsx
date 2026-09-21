import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      disabled,
      id,
      children,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || `select-${generatedId.replace(/:/g, '')}`;
    const messageId = `${selectId}-message`;
    const describedBy = [ariaDescribedBy, error || helperText ? messageId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="type-label font-medium text-slate-700 dark:text-slate-300 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            aria-invalid={ariaInvalid ?? (error ? true : undefined)}
            aria-describedby={describedBy}
            className={cn(
              'w-full h-9 rounded-md border type-form-value appearance-none transition-colors duration-150 font-normal pl-3 pr-8',
              'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
              'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500',
              'disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 dark:border-slate-700',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 pointer-events-none flex items-center text-slate-400 dark:text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error ? (
          <p id={messageId} role="alert" className="type-helper font-medium text-red-600 dark:text-red-400">{error}</p>
        ) : helperText ? (
          <p id={messageId} className="type-helper text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
