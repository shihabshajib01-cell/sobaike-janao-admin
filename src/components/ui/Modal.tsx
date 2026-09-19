import { ActionGroup, IconButton } from './Button';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
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
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)]',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative w-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-10 transition-all duration-200 animate-in zoom-in-95',
          size === 'full' && 'h-[94vh] flex flex-col',
          sizeStyles[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            {title && (
              <h3 className="type-card-title text-slate-900 dark:text-slate-100">
                {title}
              </h3>
            )}
            {description && (
              <p className="type-secondary text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
            icon={<X />}
          />
        </div>

        {/* Body */}
        <div
          className={cn(
            'p-6 type-body text-slate-700 dark:text-slate-300 overflow-y-auto',
            size === 'full' ? 'flex-1 min-h-0' : 'max-h-[calc(85vh-130px)]'
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <ActionGroup className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
            {footer}
          </ActionGroup>
        )}
      </div>
    </div>
  );
};

export default Modal;
