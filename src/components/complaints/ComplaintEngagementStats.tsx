import React, { useEffect, useState } from 'react';
import { Eye, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

interface ComplaintEngagementStatsProps {
  complaintId: string;
  status: string;
}

interface EngagementCounts {
  views: number;
  shares: number;
}

export const ComplaintEngagementStats: React.FC<ComplaintEngagementStatsProps> = ({
  complaintId,
  status,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [counts, setCounts] = useState<EngagementCounts>({ views: 0, shares: 0 });

  useEffect(() => {
    let active = true;

    const loadCounts = async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('public_view_count, public_share_count')
        .eq('id', complaintId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.warn('[ComplaintEngagementStats] Failed to load engagement counts:', error.message);
        return;
      }

      setCounts({
        views: Math.max(0, Number(data?.public_view_count || 0)),
        shares: Math.max(0, Number(data?.public_share_count || 0)),
      });
    };

    void loadCounts();
    return () => {
      active = false;
    };
  }, [complaintId]);

  const formatNumber = (num: number): string =>
    num.toLocaleString(isBn ? 'bn-BD' : 'en-US');

  return (
    <div
      className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200/80 dark:border-slate-700/80 text-xs"
      aria-label={isBn ? 'পাবলিক পোস্ট এনগেজমেন্ট' : 'Public post engagement'}
    >
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
        <Eye className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
        <span className="font-semibold">{formatNumber(counts.views)}</span>
        <span className="text-slate-400">{isBn ? 'ভিউ' : 'views'}</span>
      </div>
      <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
        <Share2 className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
        <span className="font-semibold">{formatNumber(counts.shares)}</span>
        <span className="text-slate-400">{isBn ? 'শেয়ার' : 'shares'}</span>
      </div>
      {status !== 'published' && (
        <span className="sr-only">
          {isBn ? 'বর্তমানে প্রকাশিত নয়' : 'Currently not published'}
        </span>
      )}
    </div>
  );
};

export default ComplaintEngagementStats;
