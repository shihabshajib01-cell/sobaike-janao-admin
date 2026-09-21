import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = 'md',
  fullHeight = false,
}) => {
  const { language } = useLanguage();
  const resolvedMessage = message ?? (language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...');

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center p-6 text-slate-500 dark:text-slate-400 ${
        fullHeight ? 'min-h-[400px]' : 'py-12'
      }`}
    >
      <Loader2 className={`${sizeClasses[size]} animate-spin text-sky-600 dark:text-sky-400 mb-2`} />
      {resolvedMessage && <p className="type-body font-medium">{resolvedMessage}</p>}
    </div>
  );
};

export default LoadingState;
