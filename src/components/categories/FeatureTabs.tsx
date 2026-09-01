import React from 'react';
import { Feature } from '@/types/Category';
import { useLanguage } from '@/context/LanguageContext';
import {
  AlertCircle,
  MessageSquareText,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils';

export interface FeatureTabsProps {
  features: Feature[];
  selectedFeatureId: string;
  onSelectFeature: (featureId: string) => void;
  categoryCounts?: Record<string, number>;
  className?: string;
}

const FEATURE_ICON_MAP: Record<string, React.ElementType> = {
  complaints: AlertCircle,
  public_feed: MessageSquareText,
};

export const FeatureTabs: React.FC<FeatureTabsProps> = ({
  features,
  selectedFeatureId,
  onSelectFeature,
  categoryCounts,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const totalCategoriesCount = categoryCounts
    ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
    : undefined;

  return (
    <div className={cn('w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl px-2 pt-2', className)}>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0">
        {/* "All Features" Tab */}
        <button
          id="feature-tab-all"
          type="button"
          role="tab"
          aria-selected={selectedFeatureId === 'all'}
          onClick={() => onSelectFeature('all')}
          className={cn(
            'group flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-t-lg transition-all relative border-b-2 whitespace-nowrap',
            selectedFeatureId === 'all'
              ? 'border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          )}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>{isBn ? 'সব ফিচার' : 'All Features'}</span>
          {typeof totalCategoriesCount === 'number' && (
            <span
              className={cn(
                'px-1.5 py-0.5 text-xs font-semibold rounded-full tracking-tight',
                selectedFeatureId === 'all'
                  ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
            >
              {totalCategoriesCount}
            </span>
          )}
        </button>

        {/* Feature Tabs */}
        {features.map((feature) => {
          const isSelected = selectedFeatureId === feature.id;
          const IconComponent = FEATURE_ICON_MAP[feature.id] || Sparkles;
          const count = categoryCounts ? categoryCounts[feature.id] : undefined;

          return (
            <button
              key={feature.id}
              id={`feature-tab-${feature.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectFeature(feature.id)}
              className={cn(
                'group flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-t-lg transition-all relative border-b-2 whitespace-nowrap',
                isSelected
                  ? 'border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}
            >
              <IconComponent className="w-4 h-4 shrink-0" />
              <span>{isBn ? feature.nameBn : feature.nameEn}</span>
              
              {typeof count === 'number' && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-xs font-semibold rounded-full tracking-tight',
                    isSelected
                      ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  )}
                >
                  {count}
                </span>
              )}

              {feature.status === 'inactive' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Inactive feature" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureTabs;

