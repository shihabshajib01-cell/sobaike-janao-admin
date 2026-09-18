import React, { useState } from 'react';
import { Eye, FilePenLine, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  ComplaintActionArea as BaseComplaintActionArea,
  ComplaintActionAreaProps,
} from './ComplaintActionArea';
import { PublicationComposerModal } from './PublicationComposerModal';

export const ComplaintActionAreaWithPublication: React.FC<ComplaintActionAreaProps> = ({
  complaint,
  className,
  onComplaintUpdated,
}) => {
  const { language } = useLanguage();
  const { hasPermission } = useAuth();
  const isBn = language === 'bn';
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const canPrepare =
    hasPermission('complaints.publish') &&
    (complaint.status === 'submitted' || complaint.status === 'unpublished');
  const hasPreparedDraft = Boolean(
    complaint.publicationPreferences?.publicTitleBn ||
      complaint.publicationPreferences?.publicTitleEn ||
      complaint.publicationPreferences?.publicSummaryBn ||
      complaint.publicationPreferences?.publicSummaryEn
  );

  return (
    <div className="space-y-4">
      {canPrepare && (
        <Card variant="default" className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FilePenLine className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>{isBn ? 'পাবলিক পোস্ট প্রস্তুতি' : 'Public Post Preparation'}</span>
            </CardTitle>
            {hasPreparedDraft && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="h-3 w-3" />
                {isBn ? 'প্রস্তুত' : 'Prepared'}
              </span>
            )}
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
              {isBn
                ? 'নাগরিকের মূল অভিযোগ পরিবর্তন না করে পাবলিক শিরোনাম ও সংক্ষিপ্ত সারাংশ প্রস্তুত করুন এবং লাইভ কার্ডের প্রিভিউ দেখুন।'
                : 'Prepare the public headline and concise summary without changing the citizen submission, and review the live-card preview.'}
            </p>

            {savedMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>{savedMessage}</p>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSavedMessage(null);
                setIsComposerOpen(true);
              }}
              leftIcon={<Eye />}
              className="w-full justify-center"
            >
              <span>
                {hasPreparedDraft
                  ? isBn
                    ? 'পাবলিক পোস্ট সম্পাদনা ও প্রিভিউ'
                    : 'Edit & Preview Public Post'
                  : isBn
                    ? 'পাবলিক পোস্ট প্রস্তুত ও প্রিভিউ'
                    : 'Prepare & Preview Public Post'}
              </span>
            </Button>
          </CardContent>
        </Card>
      )}

      <BaseComplaintActionArea
        complaint={complaint}
        className={className}
        onComplaintUpdated={onComplaintUpdated}
      />

      {canPrepare && (
        <PublicationComposerModal
          isOpen={isComposerOpen}
          complaint={complaint}
          onClose={() => setIsComposerOpen(false)}
          onComplaintUpdated={onComplaintUpdated}
          onSaved={(message) => setSavedMessage(message)}
        />
      )}
    </div>
  );
};

export default ComplaintActionAreaWithPublication;
