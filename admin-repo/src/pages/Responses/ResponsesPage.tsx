import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { RESPONSE_MANAGEMENT_CONNECTED } from '@/services/api';
import { MessageSquare, Info } from 'lucide-react';

export const ResponsesPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (!RESPONSE_MANAGEMENT_CONNECTED) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title={isBn ? 'প্রতিক্রিয়া' : 'Responses'}
          description={
            isBn
              ? 'জমা দেওয়া প্রতিবেদনের সঙ্গে সম্পর্কিত প্রতিক্রিয়া পর্যালোচনা করুন।'
              : 'Review responses associated with submitted reports.'
          }
        />

        {/* Honest Disconnected State */}
        <Card variant="default" className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-8 sm:p-12">
            <div className="flex flex-col items-center text-center max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-5 shadow-xs">
                <MessageSquare className="w-7 h-7" />
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {isBn ? 'প্রতিক্রিয়া মডারেশন এখনো সংযুক্ত হয়নি।' : 'Response moderation is not connected yet.'}
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                {isBn
                  ? 'বর্তমান প্রতিক্রিয়া জমা ও মডারেশন প্রক্রিয়া অনুমোদিত অ্যাডমিন API-এর সঙ্গে এখনো সংযুক্ত নয়। কোনো নমুনা তথ্য দেখানো হচ্ছে না।'
                  : 'The current response submission and moderation workflow is not connected to an approved Admin API. No sample data is shown.'}
              </p>

              <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-500 dark:text-slate-400">
                <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>
                  {isBn
                    ? 'বাস্তব response API এবং permission rules সংযুক্ত হওয়ার পর এই মডিউলটি ব্যবহার করা যাবে।'
                    : 'This module will become available after the real response API and permission rules are connected.'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for future connected phase
  return null;
};

export default ResponsesPage;
