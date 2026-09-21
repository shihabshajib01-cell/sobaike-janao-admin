import React, { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  charCount?: number;
  maxCharCount?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      charCount,
      maxCharCount,
      disabled,
      id,
      rows = 4,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || `textarea-${generatedId.replace(/:/g, '')}`;
    const messageId = `${textareaId}-message`;
    const countId = maxCharCount !== undefined ? `${textareaId}-count` : undefined;
    const describedBy = [
      ariaDescribedBy,
      error || helperText ? messageId : undefined,
      countId,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full flex flex-col space-y-1.5 text-left">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
              className="type-label font-medium text-slate-700 dark:text-slate-300 select-none"
            >
              {label}
            </label>
          )}
          {maxCharCount !== undefined && (
            <span id={countId} aria-live="polite" className="type-technical text-slate-400 dark:text-slate-500">
              {charCount !== undefined ? charCount : 0}/{maxCharCount}
            </span>
          )}
        </div>
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          aria-invalid={ariaInvalid ?? (error ? true : undefined)}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-md border type-form-value p-3 transition-colors duration-150 font-normal resize-y',
            'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500',
            'disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 dark:border-slate-700',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={messageId} role="alert" className="type-helper font-medium text-red-600 dark:text-red-400">{error}</p>
        ) : helperText ? (
          <p id={messageId} className="type-helper text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
