import React, { useState } from 'react';
import { Eye, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Complaint, ComplaintTimelineEvent } from '@/types/Complaint';
import { PublicationEditorModal } from './PublicationEditorModal';

export interface PublicationEditorLauncherProps {
  complaint: Complaint;
  onComplaintUpdated?: (
    complaint: Complaint,
    timeline: ComplaintTimelineEvent[],
    timelineError?: string | null
  ) => void;
}

export const PublicationEditorLauncher: React.FC<PublicationEditorLauncherProps> = ({
  complaint,
  onComplaintUpdated,
}) => {
  const { language } = useLanguage();
  const { hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isBn = language === 'bn';

  const canPublish = hasPermission('complaints.publish');
  const canPrepare = complaint.status === 'submitted' || complaint.status === 'unpublished';

  if (!canPublish || !canPrepare) return null;

  const savedHeadline = isBn
    ? complaint.publicationPreferences?.publicTitleBn ||
      complaint.publicationPreferences?.publicTitleEn
    : complaint.publicationPreferences?.publicTitleEn ||
      complaint.publicationPreferences?.publicTitleBn;

  return (
    <>
      <Card variant="default" className="overflow-hidden border-sky-200 dark:border-sky-900/70">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileEdit className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {isBn ? 'পাবলিক পোস্ট প্রস্তুতি' : 'Prepare for Publication'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
            {isBn
              ? 'নাগরিকের মূল অভিযোগ অপরিবর্তিত রেখে পাবলিক শিরোনাম ও সংক্ষিপ্তসার প্রস্তুত করুন, তারপর লাইভ কার্ড দেখে প্রকাশ করুন।'
              : 'Keep the citizen submission unchanged, prepare the public headline and summary, then review the live-card preview before publishing.'}
          </p>

          {savedHeadline && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {isBn ? 'সংরক্ষিত পাবলিক শিরোনাম' : 'Saved public headline'}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                {savedHeadline}
              </p>
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsOpen(true)}
            leftIcon={<Eye className="h-3.5 w-3.5" />}
            className="w-full justify-center bg-sky-600 text-white hover:bg-sky-700"
          >
            {isBn ? 'পাবলিক পোস্ট প্রস্তুত ও প্রিভিউ' : 'Prepare & Preview Public Post'}
          </Button>
        </CardContent>
      </Card>

      <PublicationEditorModal
        complaint={complaint}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplaintUpdated={onComplaintUpdated}
      />
    </>
  );
};

export default PublicationEditorLauncher;
