import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, X, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { AdminUserApiError } from '@/types/AdminUser';

export interface DeleteUserTarget {
  user_id: string;
  email: string;
  display_name: string | null;
  role_name_en?: string | null;
  role_name_bn?: string | null;
  is_super_admin?: boolean;
}

export interface DeleteUserModalProps {
  isOpen: boolean;
  user: DeleteUserTarget | null;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<void>;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  user,
  onClose,
  onConfirm,
}) => {
  const { t, language } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const roleName = language === 'bn'
    ? (user.role_name_bn || user.role_name_en || t.users.standardAdmin)
    : (user.role_name_en || t.users.standardAdmin);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await onConfirm(user.user_id);
      onClose();
    } catch (err: unknown) {
      console.error('Delete administrator error:', err);
      if (err instanceof AdminUserApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(language === 'bn' ? 'অপারেশন ব্যর্থ হয়েছে' : 'Operation failed');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-user-modal-title"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-delete-modal"
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          aria-label={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1 pr-6">
            <h3
              id="delete-user-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {t.users.deleteUserConfirmTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t.users.deleteUserConfirmDesc}
            </p>
          </div>
        </div>

        {/* Target Details Card */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {t.users.displayName}:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {user.display_name || t.users.noDisplayName}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {t.users.email}:
            </span>
            <span className="font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              {user.email}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {t.users.role}:
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              {roleName}
            </span>
          </div>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Safety Warning */}
        <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3 rounded-xl">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{t.users.superAdminCannotBeEdited}</span>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <Button
            id="btn-cancel-delete-modal"
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {t.common.cancel}
          </Button>
          <Button
            id="btn-confirm-delete-modal"
            variant="danger"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.users.deletingUser}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {t.users.deleteUser}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
