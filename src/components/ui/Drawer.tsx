import { ActionGroup, IconButton } from './Button';
import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mobileSheet?: boolean;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  size = 'md',
  mobileSheet = false,
  className,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const getFocusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activeDialog = activeElement?.closest(
        '[data-modal-dialog], [data-drawer-dialog]'
      );
      if (activeDialog && activeDialog !== dialogRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;

    if (isOpen) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => {
        const focusable = getFocusable();
        (focusable[0] || dialogRef.current)?.focus();
      });
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl',
  };

  const positionStyles = {
    right: 'inset-y-0 right-0 border-l',
    left: 'inset-y-0 left-0 border-r',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          ref={dialogRef}
          data-drawer-dialog
          tabIndex={-1}
          className={cn(
            'absolute flex flex-col w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl pointer-events-auto transition-transform duration-200',
            // If mobileSheet is enabled: Bottom sheet on mobile (max-sm)
            mobileSheet
              ? 'max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[85vh] max-sm:max-h-[85vh] max-sm:rounded-t-2xl max-sm:border-t max-sm:border-x-0 sm:inset-y-0 ' + (position === 'right' ? 'sm:right-0 sm:border-l' : 'sm:left-0 sm:border-r')
              : positionStyles[position],
            sizeStyles[size],
            className
          )}
        >
          {/* Mobile Handle Indicator (Only when mobileSheet is true) */}
          {mobileSheet && (
            <div className="sm:hidden flex items-center justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div>
              {title && (
                <h3 id={titleId} className="type-card-title text-slate-900 dark:text-slate-100">
                  {title}
                </h3>
              )}
              {description && (
                <p id={descriptionId} className="type-secondary text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
              )}
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close drawer"
              icon={<X />}
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 type-body text-slate-700 dark:text-slate-300">
            {children}
          </div>

          {/* Footer Actions */}
          {footer && (
            <ActionGroup className="px-4 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0">
              {footer}
            </ActionGroup>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
