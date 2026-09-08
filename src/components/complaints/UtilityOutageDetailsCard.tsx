import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { Complaint } from '@/types/Complaint';
import {
  Zap,
  Flame,
  Clock,
  Calendar,
  RotateCw,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { cn } from '@/utils';

export interface UtilityOutageDetailsCardProps {
  complaint: Complaint;
  className?: string;
}

function toBengaliNumerals(input: string | number): string {
  const str = String(input);
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str
    .split('')
    .map((char) => (/[0-9]/.test(char) ? bnDigits[parseInt(char, 10)] : char))
    .join('');
}

function formatIncidentTime(timeStr: string | null | undefined, isBn: boolean): string {
  if (!timeStr) return isBn ? 'অনির্দিষ্ট সময়' : 'Unspecified Time';
  // Check if HH:MM
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? (isBn ? 'অপরাহ্ন' : 'PM') : (isBn ? 'পূর্বাহ্ন' : 'AM');
    const displayHours = hours % 12 || 12;
    const timeFormatted = `${displayHours}:${minutes} ${period}`;
    return isBn ? toBengaliNumerals(timeFormatted) : timeFormatted;
  }
  return isBn ? toBengaliNumerals(timeStr) : timeStr;
}

function formatIncidentDate(dateStr: string | null | undefined, isBn: boolean): string {
  if (!dateStr) return isBn ? 'অনির্দিষ্ট তারিখ' : 'Unspecified Date';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return isBn ? toBengaliNumerals(dateStr) : dateStr;
  }
  return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatFrequency(freq: string | null | undefined, isBn: boolean): { label: string; badgeStatus: 'pending' | 'rejected' | 'default' } {
  if (!freq) {
    return {
      label: isBn ? 'এককালীন ঘটনা' : 'One-time Outage',
      badgeStatus: 'default',
    };
  }
  const f = freq.toLowerCase();
  if (f === 'repeated' || f === 'recurring' || f === 'daily') {
    return {
      label: isBn ? 'বারবার / পুনরাবৃত্তিমূলক বিভ্রাট' : 'Repeated / Recurring Outage',
      badgeStatus: 'rejected',
    };
  }
  if (f === 'continuous' || f === 'ongoing') {
    return {
      label: isBn ? 'চলমান / দীর্ঘস্থায়ী সংকট' : 'Continuous / Ongoing Outage',
      badgeStatus: 'rejected',
    };
  }
  if (f === 'intermittent') {
    return {
      label: isBn ? 'বিরতিহীন / অনির্ধারিত বিভ্রাট' : 'Intermittent Outage',
      badgeStatus: 'pending',
    };
  }
  return {
    label: isBn ? toBengaliNumerals(freq) : freq,
    badgeStatus: 'default',
  };
}

export const UtilityOutageDetailsCard: React.FC<UtilityOutageDetailsCardProps> = ({
  complaint,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const isUtility =
    complaint.categoryId === 'load_shedding' ||
    complaint.subcategoryId === 'load-shedding-outage' ||
    complaint.subcategoryId === 'gas-shortage';

  const hasIncidentDate = Boolean(complaint.incidentDate);
  const hasIncidentTime = Boolean(complaint.incidentTime);
  const hasFrequency = Boolean(complaint.frequency);

  // If not utility and has no incident details, do not render
  if (!isUtility && !hasIncidentDate && !hasIncidentTime && !hasFrequency) {
    return null;
  }

  // If utility is electricity bill, comparison card is primary; only render this if date/time is specifically recorded
  if (
    complaint.subcategoryId === 'excess-electricity-bill' &&
    !hasIncidentDate &&
    !hasIncidentTime
  ) {
    return null;
  }

  const isGas = complaint.subcategoryId === 'gas-shortage';
  const isElectricity =
    complaint.subcategoryId === 'load-shedding-outage' ||
    complaint.subcategoryId === 'excess-electricity-bill' ||
    complaint.categoryId === 'load_shedding';

  const freqInfo = formatFrequency(complaint.frequency, isBn);

  return (
    <Card
      variant="default"
      className={cn(
        'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
        className
      )}
    >
      <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div
              className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center',
                isGas
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
              )}
            >
              {isGas ? (
                <Flame className="w-3.5 h-3.5" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
            </div>
            <span>
              {isGas
                ? isBn
                  ? 'গ্যাস সংকট ও বিভ্রাটের বিবরণ'
                  : 'Gas Supply Disruption Incident Details'
                : isBn
                ? 'লোডশেডিং ও বিদ্যুৎ বিভ্রাটের বিবরণ'
                : 'Power Outage & Load Shedding Incident Details'}
            </span>
          </CardTitle>

          <Badge status={freqInfo.badgeStatus} size="sm">
            <RotateCw className="w-3 h-3 mr-1" />
            {freqInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Incident Date */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {isBn ? 'ঘটনার তারিখ' : 'Incident Date'}
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatIncidentDate(complaint.incidentDate, isBn)}
            </p>
          </div>

          {/* Incident Time */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {isBn ? 'বিভ্রাটের শুরু/সময়' : 'Outage Start Time'}
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatIncidentTime(complaint.incidentTime, isBn)}
            </p>
          </div>

          {/* Outage Nature & Frequency */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              {isBn ? 'বিভ্রাটের ধারাবাহিকতা' : 'Disruption Pattern'}
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {freqInfo.label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UtilityOutageDetailsCard;
