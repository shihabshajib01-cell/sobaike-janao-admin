import React, { useState } from 'react';
import { Shield, ArrowRight, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';

export interface StepRoleDetailsProps {
  roleName: string;
  active: boolean;
  description: string;
  onRoleNameChange: (name: string) => void;
  onActiveChange: (active: boolean) => void;
  onDescriptionChange: (desc: string) => void;
  onNext: () => void;
  onCancel: () => void;
}

export const StepRoleDetails: React.FC<StepRoleDetailsProps> = ({
  roleName,
  active,
  description,
  onRoleNameChange,
  onActiveChange,
  onDescriptionChange,
  onNext,
  onCancel,
}) => {
  const { t } = useLanguage();
  const [touched, setTouched] = useState<boolean>(false);

  const trimmedName = roleName.trim();
  const isNameInvalid = touched && trimmedName.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (trimmedName.length === 0) {
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>{t.roles.step1Title}</CardTitle>
              <CardDescription>{t.roles.step1Description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {/* Role Name */}
          <div className="space-y-1.5">
            <Input
              id="role-name-input"
              label={t.roles.roleName}
              placeholder={t.roles.roleNamePlaceholder}
              value={roleName}
              onChange={(e) => onRoleNameChange(e.target.value)}
              onBlur={() => setTouched(true)}
              error={isNameInvalid ? t.roles.roleNameRequired : undefined}
              helperText={!isNameInvalid ? t.roles.roleNameHelper : undefined}
              required
              autoFocus
            />
          </div>

          {/* Status Switch */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>{t.roles.status}</span>
                  <Badge status={active ? 'success' : 'default'} size="sm">
                    {active ? t.roles.active : t.roles.inactive}
                  </Badge>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                  {active ? t.roles.statusActiveDesc : t.roles.statusInactiveDesc}
                </p>
              </div>

              <Switch
                id="role-status-switch"
                checked={active}
                onChange={onActiveChange}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Textarea
              id="role-description-textarea"
              label={t.roles.descriptionOptional}
              placeholder={t.roles.descriptionPlaceholder}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              helperText={t.roles.descriptionOptional}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sticky / Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          id="step1-cancel-btn"
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          leftIcon={<X className="w-4 h-4" />}
        >
          <span>{t.roles.cancel}</span>
        </Button>

        <Button
          id="step1-next-btn"
          type="submit"
          variant="primary"
          size="md"
          disabled={trimmedName.length === 0}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          <span>{t.roles.next}</span>
        </Button>
      </div>
    </form>
  );
};

export default StepRoleDetails;
