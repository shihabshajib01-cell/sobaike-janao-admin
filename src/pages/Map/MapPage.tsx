import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { MAP_MONITORING_CONNECTED } from '@/services/api';
import { MapPin, Info } from 'lucide-react';

export const MapPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (!MAP_MONITORING_CONNECTED) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title={isBn ? 'ম্যাপ মনিটরিং' : 'Map Monitoring'}
          description={
            isBn
              ? 'জিওস্পেশাল মনিটরিং সংযুক্ত হলে অবস্থানভিত্তিক প্রতিবেদন কার্যক্রম দেখুন।'
              : 'View location-based report activity when geospatial monitoring is connected.'
          }
        />

        {/* Honest Disconnected State */}
        <Card variant="default" className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-8 sm:p-12">
            <div className="flex flex-col items-center text-center max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-5 shadow-xs">
                <MapPin className="w-7 h-7" />
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {isBn ? 'ম্যাপ মনিটরিং এখনো সংযুক্ত হয়নি।' : 'Map monitoring is not connected yet.'}
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                {isBn
                  ? 'বর্তমান ম্যাপ ডাটা ও ভৌগোলিক ভিউটি শুধু প্রোটোটাইপ এবং অনুমোদিত প্রোডাকশন জিওস্পেশাল প্রক্রিয়ার সঙ্গে সংযুক্ত নয়। কোনো নমুনা লোকেশন দেখানো হচ্ছে না।'
                  : 'The current map data and geographic view are prototype-only and are not connected to the approved production geospatial workflow. No sample locations are shown.'}
              </p>

              <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-500 dark:text-slate-400 text-left">
                <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>
                  {isBn
                    ? 'বাস্তব অভিযোগের লোকেশন তথ্য ইতোমধ্যে রয়েছে এবং নির্ধারিত জিওস্পেশাল ইমপ্লিমেন্টেশন পর্যায়ে তা সংযুক্ত করা হবে।'
                    : 'Real complaint location fields already exist and will be connected in the dedicated geospatial implementation phase.'}
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

export default MapPage;
