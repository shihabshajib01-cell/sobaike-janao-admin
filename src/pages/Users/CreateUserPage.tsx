import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { adminUserApi } from '@/services/api/adminUserApi';
import { AssignableRole } from '@/types/AdminUser';
import {
  ArrowLeft,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const CreateUserPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  // Form State
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);

  // UI State
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [roles, setRoles] = useState<AssignableRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load assignable roles
  useEffect(() => {
    let mounted = true;
    adminUserApi
      .getAssignableRoles()
      .then((data) => {
        if (mounted) {
          setRoles(data);
          if (data.length > 0) {
            setRoleId(data[0].id);
          }
          setRolesLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('Failed to load assignable roles:', err);
          setError(isBn ? 'ভূমিকা তালিকা লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load assignable roles.');
          setRolesLoading(false);
        }
      });

    return () => {
      mounted = false;
      // Sensitive field security: clear password from memory on unmount
      setPassword('');
      setConfirmPassword('');
    };
  }, [isBn]);

  const selectedRoleObj = roles.find((r) => r.id === roleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();

    // Client-side validations
    if (!cleanEmail) {
      setError(t.users.emailRequired);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError(isBn ? 'একটি সঠিক ইমেইল ঠিকানা দিন।' : 'Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError(t.users.passwordLengthError);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.users.passwordMismatch);
      return;
    }

    if (!roleId) {
      setError(t.users.roleRequired);
      return;
    }

    setSubmitting(true);

    try {
      await adminUserApi.createUser({
        email: cleanEmail,
        password,
        display_name: cleanDisplayName || null,
        role_id: roleId,
        active,
      });

      // Clear passwords before navigating
      setPassword('');
      setConfirmPassword('');

      navigate('/users', {
        state: {
          userCreatedSuccess: true,
          userName: cleanDisplayName || cleanEmail,
        },
      });
    } catch (err: unknown) {
      console.error('Create user failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create user.';
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16" id="create-user-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          id="btn-back-to-users"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/users')}
          className="h-9 w-9 p-0"
          aria-label={t.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t.users.createUserTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.users.createUserDesc}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          id="create-user-error-alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800 dark:text-rose-200">
            <p className="font-semibold">{isBn ? 'ত্রুটি' : 'Error'}</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6"
      >
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            {isBn ? 'মৌলিক তথ্য' : 'Account Details'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Display Name */}
            <div>
              <label
                htmlFor="input-display-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t.users.displayName} <span className="text-slate-400 font-normal">({isBn ? 'ঐচ্ছিক' : 'Optional'})</span>
              </label>
              <input
                id="input-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={isBn ? 'যেমন: তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'}
                maxLength={100}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="input-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t.users.email} <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@sobaike-janao.org"
                autoComplete="off"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            {isBn ? 'নিরাপত্তা শংসাপত্র' : 'Initial Password'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label
                htmlFor="input-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t.users.password} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                  className="w-full pl-3 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 text-slate-900 dark:text-slate-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isBn ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড হতে হবে।' : 'Must be at least 6 characters.'}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="input-confirm-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t.users.confirmPassword} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                  className="w-full pl-3 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 text-slate-900 dark:text-slate-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Role Assignment */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            {t.users.role} <span className="text-rose-500">*</span>
          </h3>

          <div>
            <select
              id="select-user-role"
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={rolesLoading || roles.length === 0}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 text-slate-900 dark:text-slate-100"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {isBn ? r.name_bn || r.name_en : r.name_en}
                </option>
              ))}
            </select>

            {selectedRoleObj && (
              <div className="mt-2.5 p-3 rounded-lg bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 text-xs text-sky-800 dark:text-sky-200 flex items-start gap-2">
                <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    {isBn ? selectedRoleObj.name_bn || selectedRoleObj.name_en : selectedRoleObj.name_en}:
                  </span>{' '}
                  <span>{selectedRoleObj.description || (isBn ? 'কোনো বিবরণ নেই।' : 'No description available.')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            {t.users.status}
          </h3>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                id="radio-status-active"
                type="radio"
                name="user-status"
                checked={active === true}
                onChange={() => setActive(true)}
                className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
              />
              <span className="font-medium">{t.users.active}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                id="radio-status-inactive"
                type="radio"
                name="user-status"
                checked={active === false}
                onChange={() => setActive(false)}
                className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
              />
              <span className="font-medium">{t.users.inactive}</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            id="btn-cancel-create-user"
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate('/users')}
            disabled={submitting}
          >
            {t.common.cancel}
          </Button>
          <Button
            id="btn-submit-create-user"
            type="submit"
            variant="primary"
            size="md"
            disabled={submitting || rolesLoading}
          >
            {submitting ? t.users.creatingUser : t.users.createUser}
          </Button>
        </div>
      </form>
    </div>
  );
};
