import React, { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode | React.ElementType<{ className?: string }>;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  const { language } = useLanguage();
  const resolvedTitle =
    title ?? (language === 'bn' ? 'কোনো তথ্য পাওয়া যায়নি' : 'No data available');
  const resolvedDescription =
    description ??
    (language === 'bn'
      ? 'এই মুহূর্তে দেখানোর মতো কোনো আইটেম নেই।'
      : 'There are no items to display right now.');

  const renderIcon = () => {
    if (!icon) {
      return <Inbox className="w-6 h-6" />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))
    ) {
      const IconComponent = icon as React.ElementType<{ className?: string }>;
      return <IconComponent className="w-6 h-6" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 my-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        {renderIcon()}
      </div>
      <h3 className="type-card-title text-slate-800 dark:text-slate-200 mb-1">{resolvedTitle}</h3>
      <p className="type-secondary text-slate-500 dark:text-slate-400 max-w-sm mb-4">{resolvedDescription}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
