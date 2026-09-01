import React from 'react';
import { FeedStatusFilter } from '@/types/Post';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils';
import { LayoutGrid, Globe, EyeOff } from 'lucide-react';

export interface FeedStatusTabsProps {
  activeTab: FeedStatusFilter;
  onChange: (tab: FeedStatusFilter) => void;
  counts: Record<FeedStatusFilter, number>;
  className?: string;
}

export const FeedStatusTabs: React.FC<FeedStatusTabsProps> = ({
  activeTab,
  onChange,
  counts,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const tabs: {
    id: FeedStatusFilter;
    labelEn: string;
    labelBn: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'all',
      labelEn: 'All Content',
      labelBn: 'সকল কনটেন্ট',
      icon: LayoutGrid,
    },
    {
      id: 'unpublished',
      labelEn: 'Unpublished',
      labelBn: 'অপ্রকাশিত',
      icon: EyeOff,
    },
    {
      id: 'published',
      labelEn: 'Published / Live',
      labelBn: 'লাইভ প্রকাশিত',
      icon: Globe,
    },
  ];

  return (
    <div
      className={cn(
        'w-full max-w-full overflow-x-auto p-1 bg-slate-100/80 dark:bg-slate-900/90 rounded-lg border border-slate-200/80 dark:border-slate-800/80 scrollbar-none',
        className
      )}
      role="tablist"
      aria-label="Feed status tabs"
    >
      <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.id] ?? 0;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                isActive
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              )}
            >
              <Icon
                className={cn(
                  'w-3.5 h-3.5',
                  isActive
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              />
              <span>{isBn ? tab.labelBn : tab.labelEn}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold transition-colors',
                  isActive
                    ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FeedStatusTabs;
