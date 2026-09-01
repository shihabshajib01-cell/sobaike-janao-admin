import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { BarChart3, RotateCcw } from 'lucide-react';

export interface AnalyticsEmptyStateProps {
  onResetFilters?: () => void;
}

export const AnalyticsEmptyState: React.FC<AnalyticsEmptyStateProps> = ({ onResetFilters }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <Card variant="default" className="w-full">
      <CardContent className="py-12 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
          {isBn ? 'কোনো অ্যানালিটিক্স ডাটা পাওয়া যায়নি' : 'No Analytics Data Found'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">
          {isBn
            ? 'নির্বাচিত ফিল্টার বা সময়সীমার মধ্যে কোনো রেকর্ড নেই। অনুগ্রহ করে অন্য তারিখ বা ক্যাটাগরি নির্বাচন করুন।'
            : 'No activity records match the selected date range or category filters. Try expanding your search criteria.'}
        </p>
        {onResetFilters && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onResetFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {isBn ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsEmptyState;
