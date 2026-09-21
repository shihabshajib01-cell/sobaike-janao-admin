import { ButtonBase } from '@/components/ui/Button';
import React, { forwardRef, useId, useState } from 'react';
import { cn } from '@/utils';
import { useLanguage } from '@/context/LanguageContext';

export interface SwitchProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      id,
      checked,
      defaultChecked = false,
      onChange,
      disabled = false,
      label,
      description,
      className,
      size = 'md',
    },
    ref
  ) => {
    const { language } = useLanguage();
    const isBn = language === 'bn';
    const generatedId = useId();
    const switchId = id || `switch-${generatedId.replace(/:/g, '')}`;
    const labelId = label ? `${switchId}-label` : undefined;
    const descriptionId = description ? `${switchId}-description` : undefined;
    const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? Boolean(checked) : internalChecked;
    const isSmall = size === 'sm';

    const handleClick = () => {
      if (disabled) return;
      const next = !isChecked;
      if (!isControlled) {
        setInternalChecked(next);
      }
      onChange?.(next);
    };

    return (
      <div className={cn('inline-flex items-start gap-2.5 select-none', disabled && 'opacity-60 cursor-not-allowed')}>
        <ButtonBase
          id={switchId}
          ref={ref}
          type="button"
          role="switch"
          aria-checked={isChecked}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          aria-label={!label ? (isBn ? 'সেটিং পরিবর্তন করুন' : 'Toggle setting') : undefined}
          disabled={disabled}
          onClick={handleClick}
          className={cn(
            'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed',
            isSmall ? 'h-4 w-7' : 'h-5 w-9',
            isChecked ? 'bg-sky-600 dark:bg-sky-500' : 'bg-slate-300 dark:bg-slate-700',
            className
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
              isSmall ? 'h-3 w-3 mt-0.5 ml-0.5' : 'h-4 w-4 mt-0.5 ml-0.5',
              isChecked ? (isSmall ? 'translate-x-3' : 'translate-x-4') : 'translate-x-0'
            )}
          />
        </ButtonBase>

        {(label || description) && (
          <div className="flex flex-col text-left cursor-pointer" onClick={handleClick}>
            {label && (
              <span id={labelId} className="type-label font-medium text-slate-800 dark:text-slate-200">
                {label}
              </span>
            )}
            {description && (
              <span id={descriptionId} className="type-helper text-slate-500 dark:text-slate-400">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
export default Switch;
