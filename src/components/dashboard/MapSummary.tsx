import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { MapSummaryData } from '@/types/Dashboard';
import { MapPin, Navigation, ArrowUpRight, Compass } from 'lucide-react';
import { cn } from '@/utils';

export interface MapSummaryProps {
  mapData: MapSummaryData | null;
  loading?: boolean;
}

export const MapSummary: React.FC<MapSummaryProps> = ({ mapData, loading }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  if (loading || !mapData) {
    return (
      <Card variant="default" className="h-full">
        <CardHeader>
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-52 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'ভৌগোলিক ও ওয়ার্ড নজরদারি সারসংক্ষেপ' : 'Geographic Triage & Hotspots'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'ঢাকা মেট্রোপলিটন ওয়ার্ডভিত্তিক স্থানিক ঘনত্ব ও উচ্চ ঝুঁকি ক্লাস্টার'
                : 'Spatial density and critical location clusters across metropolitan zones'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-4">
          {/* Visual Geo-Spatial Summary Canvas Placeholder */}
          <div className="relative h-44 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex flex-col justify-between p-3.5 select-none group">
            {/* Grid Pattern Background */}
            <div
              className="absolute inset-0 opacity-25 dark:opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                backgroundSize: '16px 16px',
              }}
            />

            {/* Subtle Dhaka Ward Contours Visualization */}
            <svg
              className="absolute inset-0 w-full h-full opacity-40 dark:opacity-30 text-sky-600 dark:text-sky-500"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M30,30 Q90,50 140,20 T260,60 T350,30 T420,90 T490,140"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M40,110 Q120,80 200,120 T320,100 T440,130"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>

            {/* Live Geo Pings on the map placeholder */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/90 dark:bg-black/60 backdrop-blur-xs border border-slate-200 dark:border-white/10 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {isBn ? 'সক্রিয় জিপিএস পিন' : 'Live Geo Grid'}:{' '}
                {formatNumber(mapData.totalComplaintLocations)}
              </span>

              <span className="px-2 py-1 rounded bg-white/90 dark:bg-black/60 backdrop-blur-xs border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300">
                {mapData.primaryZone}
              </span>
            </div>

            {/* Interactive Pin Clusters Simulation */}
            <div className="relative z-10 grid grid-cols-2 gap-2 my-auto">
              {mapData.recentPings.slice(0, 2).map((ping) => (
                <div
                  key={ping.id}
                  className="bg-white/95 dark:bg-slate-950/80 backdrop-blur-xs border border-sky-500/20 dark:border-sky-500/30 rounded p-1.5 flex items-center gap-1.5 text-slate-900 dark:text-white shadow-xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 animate-bounce" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold truncate leading-tight">{ping.title}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                      {ping.ward} • {ping.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action Link to Map */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {isBn ? '১৪টি ওয়ার্ডে উচ্চ ঘনত্ব' : '14 Active Ward Hotspots'}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/map')}
                className="h-6 px-2 text-[11px] bg-sky-600 hover:bg-sky-500 text-white"
              >
                <span>{isBn ? 'পূর্ণাঙ্গ ম্যাপ খুলুন' : 'Open Full Map'}</span>
                <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

          {/* Hotspot Ward Table/List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-sky-500" />
                <span>{isBn ? 'শীর্ষ সক্রিয় ওয়ার্ড' : 'Top Active Hotspot Wards'}</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {isBn ? 'গত ৭ দিনের হিসেব' : 'Past 7 days'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {mapData.hotspotWards.map((item) => (
                <div
                  key={item.ward}
                  className="p-2 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                      {item.ward}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block">{item.zone}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {formatNumber(item.count)}
                    </span>
                    <Badge
                      status={
                        item.urgencyLevel === 'high'
                          ? 'rejected'
                          : item.urgencyLevel === 'medium'
                          ? 'pending'
                          : 'default'
                      }
                      size="sm"
                      className="text-[9px] px-1 py-0 block mt-0.5"
                    >
                      {item.urgencyLevel}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>{isBn ? 'ভৌগোলিক ট্র্যাকিং সক্রিয়' : 'GIS Monitoring Active'}</span>
        <button
          onClick={() => navigate('/map')}
          className="text-sky-600 dark:text-sky-400 hover:underline font-medium text-[11px]"
        >
          {isBn ? 'বিস্তারিত ম্যাপ দেখুন' : 'Explore Spatial Dashboard →'}
        </button>
      </div>
    </Card>
  );
};

export default MapSummary;
