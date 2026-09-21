import { ActionGroup, IconButton } from './Button';
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { useLanguage } from '@/context/LanguageContext';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  bodyClassName?: string;
  mobileFullscreen?: boolean;
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  bodyClassName,
  mobileFullscreen = false,
  closeOnBackdrop = true,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
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
      const activeDialog = activeElement?.closest('[data-modal-dialog]');
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
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)]',
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto',
        mobileFullscreen ? 'p-0 sm:p-6' : 'p-4 sm:p-6'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={dialogRef}
        data-modal-dialog
        tabIndex={-1}
        className={cn(
          'relative w-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-10 transition-all duration-200 animate-in zoom-in-95',
          size === 'full' && 'h-[94vh] flex flex-col',
          mobileFullscreen &&
            'max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:shadow-none',
          sizeStyles[size],
          className
        )}
      >
        {/* Header */}
        <div
          data-modal-header
          className={cn(
            'flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80',
            mobileFullscreen && 'max-sm:px-4 max-sm:py-3'
          )}
        >
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
            aria-label={isBn ? 'মোডাল বন্ধ করুন' : 'Close modal'}
            icon={<X />}
          />
        </div>

        {/* Body */}
        <div
          data-modal-body
          className={cn(
            'p-6 type-body text-slate-700 dark:text-slate-300 overflow-y-auto',
            size === 'full' ? 'flex-1 min-h-0' : 'max-h-[calc(85vh-130px)]',
            mobileFullscreen && 'max-sm:p-4',
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <ActionGroup
            data-modal-footer
            className={cn(
              'px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50',
              mobileFullscreen && 'max-sm:px-4 max-sm:py-3'
            )}
          >
            {footer}
          </ActionGroup>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
