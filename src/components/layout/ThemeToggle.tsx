import React from 'react';
import { useTheme } from '@/themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'segmented';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'icon',
}) => {
  const { mode, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <SegmentedControl
        value={mode}
        onChange={setTheme}
        className={className}
        ariaLabel="Color theme"
        options={[
          {
            value: 'light',
            icon: <Sun />,
            ariaLabel: 'Light theme',
          },
          {
            value: 'dark',
            icon: <Moon />,
            ariaLabel: 'Dark theme',
          },
          {
            value: 'system',
            icon: <Laptop />,
            ariaLabel: 'System theme',
          },
        ]}
      />
    );
  }

  const switchingTo = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <IconButton
      variant="ghost"
      size="md"
      onClick={toggleTheme}
      className={className}
      title={`Switch to ${switchingTo} mode`}
      aria-label="Toggle color theme"
      icon={
        resolvedTheme === 'dark' ? (
          <Sun className="text-amber-400" />
        ) : (
          <Moon />
        )
      }
    />
  );
};

export default ThemeToggle;
