import React from 'react';
import { Eye, Clock, MapPin, Monitor, Smartphone, Tablet, HelpCircle, Globe, Compass } from 'lucide-react';
import { PublicVisitSession } from '@/types/LocationActivity';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LocationPermissionBadge } from './LocationPermissionBadge';
import { LocationActivityEmptyState } from './LocationActivityEmptyState';
import { useLanguage } from '@/context/LanguageContext';

export interface MobileLocationActivityCardListProps {
  sessions: PublicVisitSession[];
  selectedSession?: PublicVisitSession | null;
  onSelectSession: (session: PublicVisitSession) => void;
  hasFilters?: boolean;
  onResetFilters?: () => void;
  isLoading?: boolean;
}

export const MobileLocationActivityCardList: React.FC<MobileLocationActivityCardListProps> = ({
  sessions,
  selectedSession,
  onSelectSession,
  hasFilters = false,
  onResetFilters,
  isLoading = false,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (!isLoading && sessions.length === 0) {
    return <LocationActivityEmptyState hasFilters={hasFilters} onResetFilters={onResetFilters} />;
  }

  const formatTimestamp = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const renderDeviceIcon = (category?: string | null) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('desktop')) return <Monitor className="w-3.5 h-3.5 text-slate-500" />;
    if (cat.includes('mobile')) return <Smartphone className="w-3.5 h-3.5 text-slate-500" />;
    if (cat.includes('tablet')) return <Tablet className="w-3.5 h-3.5 text-slate-500" />;
    return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
  };

  const formatLocation = (session: PublicVisitSession) => {
    if (
      session.permission_status === 'granted' &&
      session.latitude !== null &&
      session.longitude !== null
    ) {
      return `${session.latitude.toFixed(5)}, ${session.longitude.toFixed(5)}`;
    }
    return isBn ? 'শেয়ার করা হয়নি' : 'Not shared';
  };

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isSelected = selectedSession?.id === session.id;
        const isGranted = session.permission_status === 'granted' && session.latitude !== null;

        return (
          <Card
            key={session.id}
            variant="default"
            className={`transition-all cursor-pointer ${
              isSelected ? 'ring-2 ring-sky-500 shadow-sm' : 'hover:border-slate-300 dark:hover:border-slate-700'
            }`}
            onClick={() => onSelectSession(session)}
          >
            <CardContent className="p-3.5 space-y-2.5">
              {/* Header: Permission Badge + Timestamp */}
              <div className="flex items-center justify-between gap-2">
                <LocationPermissionBadge status={session.permission_status} />
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatTimestamp(session.last_seen_at)}</span>
                </div>
              </div>

              {/* Location Row */}
              <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <MapPin
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    isGranted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                  <span
                    className={`text-xs font-mono truncate ${
                      isGranted
                        ? 'text-slate-900 dark:text-slate-100 font-semibold'
                        : 'text-slate-500 dark:text-slate-400 italic'
                    }`}
                  >
                    {formatLocation(session)}
                  </span>
                  {session.accuracy_meters !== null && session.accuracy_meters !== undefined && (
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      ±{Math.round(session.accuracy_meters)}m
                    </span>
                  )}
                </div>
              </div>

              {/* Device & Browser Info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850/60 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderDeviceIcon(session.device_category)}
                  <span className="truncate capitalize">
                    {session.device_category || (isBn ? 'অজানা' : 'Unknown')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {session.browser_name || '—'} {session.browser_version || ''}
                  </span>
                </div>
              </div>

              {/* Footer: Timezone & Details button */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  <Compass className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{session.timezone || '—'}</span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSession(session);
                  }}
                  leftIcon={<Eye className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                  className="text-xs h-7 px-2.5 shrink-0"
                >
                  <span>{isBn ? 'বিস্তারিত দেখুন' : 'View Details'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileLocationActivityCardList;
