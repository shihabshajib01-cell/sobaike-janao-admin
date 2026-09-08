import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { Complaint } from '@/types/Complaint';
import {
  Zap,
  TrendingUp,
  Receipt,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import { cn } from '@/utils';

export interface UtilityBillComparisonCardProps {
  complaint: Complaint;
  className?: string;
}

const BN_MONTHS: Record<string, string> = {
  '01': 'জানুয়ারি',
  '02': 'ফেব্রুয়ারি',
  '03': 'মার্চ',
  '04': 'এপ্রিল',
  '05': 'মে',
  '06': 'জুন',
  '07': 'জুলাই',
  '08': 'আগস্ট',
  '09': 'সেপ্টেম্বর',
  '10': 'অক্টোবর',
  '11': 'নভেম্বর',
  '12': 'ডিসেম্বর',
};

const EN_MONTHS: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

function formatBillMonth(monthStr: string | null | undefined, isBn: boolean): string {
  if (!monthStr) return isBn ? 'অনির্দিষ্ট মাস' : 'Unspecified Month';
  // Check if format is YYYY-MM
  const match = monthStr.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const [, year, month] = match;
    const monthName = isBn
      ? BN_MONTHS[month] || month
      : EN_MONTHS[month] || month;
    const yearDisplay = isBn ? toBengaliNumerals(year) : year;
    return `${monthName} ${yearDisplay}`;
  }
  return isBn ? toBengaliNumerals(monthStr) : monthStr;
}

function toBengaliNumerals(input: string | number): string {
  const str = String(input);
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str
    .split('')
    .map((char) => (/[0-9]/.test(char) ? bnDigits[parseInt(char, 10)] : char))
    .join('');
}

function formatCurrency(amount: number | null | undefined, isBn: boolean): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return isBn ? 'তথ্য নেই' : 'N/A';
  }
  const formatted = amount.toLocaleString('en-US');
  if (isBn) {
    return `৳ ${toBengaliNumerals(formatted)}`;
  }
  return `৳ ${formatted}`;
}

export const UtilityBillComparisonCard: React.FC<UtilityBillComparisonCardProps> = ({
  complaint,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const recentAmount = complaint.recentBillAmount ?? null;
  const previousAmount = complaint.previousBillAmount ?? null;
  const recentMonth = complaint.recentBillMonth;
  const previousMonth = complaint.previousBillMonth;

  // If both amounts are null or undefined, don't render this comparison card
  if (recentAmount === null && previousAmount === null && !recentMonth && !previousMonth) {
    return null;
  }

  const hasBothAmounts = recentAmount !== null && previousAmount !== null;
  const diffAmount = hasBothAmounts ? recentAmount - previousAmount : null;
  const percentageIncrease =
    hasBothAmounts && previousAmount > 0
      ? ((recentAmount - previousAmount) / previousAmount) * 100
      : null;
  const multiplier =
    hasBothAmounts && previousAmount > 0 ? recentAmount / previousAmount : null;

  const isSurge = percentageIncrease !== null && percentageIncrease >= 50;
  const isModerateIncrease =
    percentageIncrease !== null && percentageIncrease >= 20 && percentageIncrease < 50;
  const isDecrease = diffAmount !== null && diffAmount < 0;

  return (
    <Card
      variant="default"
      className={cn(
        'border-amber-200/70 dark:border-amber-900/60 bg-white dark:bg-slate-900',
        className
      )}
    >
      <CardHeader className="bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span>
              {isBn
                ? 'বিদ্যুৎ বিল বিশ্লেষণ ও তুলনামূলক নিরীক্ষা'
                : 'Electricity Bill Audit & Comparison'}
            </span>
          </CardTitle>

          {hasBothAmounts && (
            <div>
              {isSurge ? (
                <Badge
                  status="rejected"
                  size="sm"
                  className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {isBn ? 'অস্বাভাবিক বিল বৃদ্ধি (Surge)' : 'Abnormal Bill Surge'}
                </Badge>
              ) : isModerateIncrease ? (
                <Badge
                  status="pending"
                  size="sm"
                  className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {isBn ? 'উল্লেখযোগ্য বৃদ্ধি' : 'Notable Increase'}
                </Badge>
              ) : isDecrease ? (
                <Badge
                  status="approved"
                  size="sm"
                  className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                >
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {isBn ? 'বিল হ্রাস' : 'Bill Decreased'}
                </Badge>
              ) : (
                <Badge
                  status="info"
                  size="sm"
                  className="bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800"
                >
                  <Receipt className="w-3 h-3 mr-1" />
                  {isBn ? 'বিল তথ্য দাখিলকৃত' : 'Bill Record Logged'}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Core Bill Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Previous Bill */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {isBn ? 'পূর্ববর্তী মাসের বিল' : 'Previous Month Bill'}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {formatBillMonth(previousMonth, isBn)}
            </p>
            <p className="text-base sm:text-lg font-bold font-mono text-slate-800 dark:text-slate-200 pt-1">
              {formatCurrency(previousAmount, isBn)}
            </p>
          </div>

          {/* 2. Recent Bill */}
          <div className="p-3.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1 font-medium">
                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                {isBn ? 'চলতি / সাম্প্রতিক বিল' : 'Recent Disputed Bill'}
              </span>
            </div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {formatBillMonth(recentMonth, isBn)}
            </p>
            <p className="text-base sm:text-lg font-bold font-mono text-amber-900 dark:text-amber-200 pt-1">
              {formatCurrency(recentAmount, isBn)}
            </p>
          </div>

          {/* 3. Discrepancy Amount */}
          <div
            className={cn(
              'p-3.5 rounded-lg border space-y-1',
              isSurge
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
            )}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                {isBn ? 'পার্থক্য / অতিরিক্ত বিল' : 'Excess Discrepancy'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn ? 'ধার্যকৃত অতিরিক্ত অর্থ' : 'Additional Amount Charged'}
            </p>
            <p
              className={cn(
                'text-base sm:text-lg font-bold font-mono pt-1',
                diffAmount !== null && diffAmount > 0
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-slate-700 dark:text-slate-300'
              )}
            >
              {diffAmount !== null
                ? `${diffAmount > 0 ? '+' : ''}${formatCurrency(diffAmount, isBn)}`
                : isBn
                ? 'তথ্য অপ্রতুল'
                : 'N/A'}
            </p>
          </div>

          {/* 4. Percentage Surge & Ratio */}
          <div
            className={cn(
              'p-3.5 rounded-lg border space-y-1',
              isSurge
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
            )}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                {isBn ? 'বৃদ্ধির হার ও গুণক' : 'Surge Rate & Ratio'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {multiplier !== null
                ? isBn
                  ? `${toBengaliNumerals(multiplier.toFixed(2))} গুণ বিল ধার্য`
                  : `${multiplier.toFixed(2)}x baseline charge`
                : isBn
                ? 'তুলনা করা যাচ্ছে না'
                : 'Insufficient baseline'}
            </p>
            <p
              className={cn(
                'text-base sm:text-lg font-bold font-mono pt-1',
                percentageIncrease !== null && percentageIncrease > 0
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-slate-700 dark:text-slate-300'
              )}
            >
              {percentageIncrease !== null
                ? isBn
                  ? `+${toBengaliNumerals(percentageIncrease.toFixed(1))}%`
                  : `+${percentageIncrease.toFixed(1)}%`
                : isBn
                ? 'তথ্য নেই'
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Informative Guidance Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">
              {isBn ? 'তদারকি ও অডিট নির্দেশনা' : 'Moderation & Audit Notice'}
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              {isBn
                ? 'নাগরিকের বিদ্যুৎ বিল বৃদ্ধির মাত্রা যাচাই করতে দাখিলকৃত বিলের কপি এবং পূর্ববর্তী পরিশোধিত রসিদের সাথে মিটার রিডিং ও স্ল্যাব রেট নিরীক্ষা করুন।'
                : 'Cross-verify citizen meter readings, customer ID, and tariff slabs against attached bill scans or previous payment receipts to detect billing irregularities.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UtilityBillComparisonCard;
