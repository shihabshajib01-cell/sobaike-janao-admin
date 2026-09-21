import React from 'react';
import { useTheme } from '@/themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useLanguage } from '@/context/LanguageContext';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'segmented';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'icon',
}) => {
  const { mode, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (variant === 'segmented') {
    return (
      <SegmentedControl
        value={mode}
        onChange={setTheme}
        className={className}
        ariaLabel={isBn ? 'রঙের থিম' : 'Color theme'}
        options={[
          {
            value: 'light',
            icon: <Sun />,
            ariaLabel: isBn ? 'লাইট থিম' : 'Light theme',
          },
          {
            value: 'dark',
            icon: <Moon />,
            ariaLabel: isBn ? 'ডার্ক থিম' : 'Dark theme',
          },
          {
            value: 'system',
            icon: <Laptop />,
            ariaLabel: isBn ? 'সিস্টেম থিম' : 'System theme',
          },
        ]}
      />
    );
  }

  const switchingTo = resolvedTheme === 'dark' ? 'light' : 'dark';
  const switchLabel = isBn
    ? (switchingTo === 'light' ? 'লাইট মোডে যান' : 'ডার্ক মোডে যান')
    : `Switch to ${switchingTo} mode`;

  return (
    <IconButton
      variant="ghost"
      size="md"
      onClick={toggleTheme}
      className={className}
      title={switchLabel}
      aria-label={isBn ? 'রঙের থিম পরিবর্তন করুন' : 'Toggle color theme'}
      icon={
        resolvedTheme === 'dark' ? (
          <Sun />
        ) : (
          <Moon />
        )
      }
    />
  );
};

export default ThemeToggle;
