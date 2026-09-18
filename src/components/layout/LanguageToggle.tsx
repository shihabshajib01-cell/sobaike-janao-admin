import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

export interface LanguageToggleProps {
  className?: string;
  variant?: 'button' | 'dropdown';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <SegmentedControl
      value={language}
      onChange={setLanguage}
      className={className}
      ariaLabel="Language"
      options={[
        {
          value: 'en',
          label: 'EN',
          ariaLabel: 'Switch to English',
        },
        {
          value: 'bn',
          label: 'বাং',
          ariaLabel: 'বাংলা ভাষায় পরিবর্তন করুন',
          className: 'font-bengali',
        },
      ]}
    />
  );
};

export default LanguageToggle;
