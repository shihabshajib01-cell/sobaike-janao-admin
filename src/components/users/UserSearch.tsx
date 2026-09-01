import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/context/LanguageContext';

export interface UserSearchProps {
  value: string;
  onChange: (val: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export const UserSearch: React.FC<UserSearchProps> = ({
  value,
  onChange,
  onClear,
  placeholder,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className={`relative ${className || ''}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          placeholder ||
          (isBn ? 'নাম বা ইমেইল দিয়ে খুঁজুন...' : 'Search by name or email...')
        }
        leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        rightIcon={
          value ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                onClear?.();
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
        className="w-full text-xs"
      />
    </div>
  );
};

export default UserSearch;
