import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Complaint } from '@/types/Complaint';
import { useLanguage } from '@/context/LanguageContext';
import { Layers } from 'lucide-react';

const ACTION_LABELS: Record<string, { en: string; bn: string }> = {
  threatened: { en: 'Threatening to distribute', bn: 'ফাঁস করার হুমকি দেওয়া হচ্ছে' },
  already_shared: { en: 'Already shared / distributed', bn: 'ইতিমধ্যে ছড়িয়ে দেওয়া হয়েছে' },
  recorded_secretly: { en: 'Recorded secretly without consent', bn: 'সম্মতি ছাড়া গোপনে ধারণ করা হয়েছে' },
  manipulated_deepfake: { en: 'Manipulated / Edited / Deepfake content', bn: 'বিকৃত / এডিট / ডিপফেক কনটেন্ট' },
  other: { en: 'Other situation', bn: 'অন্যান্য পরিস্থিতি' },
};

const PLATFORM_LABELS: Record<string, { en: string; bn: string }> = {
  facebook: { en: 'Facebook', bn: 'ফেসবুক' },
  messenger: { en: 'Messenger', bn: 'মেসেঞ্জার' },
  whatsapp: { en: 'WhatsApp', bn: 'হোয়াটসঅ্যাপ' },
  telegram: { en: 'Telegram', bn: 'টেলিগ্রাম' },
  dating_app: { en: 'Dating / Matrimonial App', bn: 'ডেটিং / ম্যাট্রিমোনিয়াল অ্যাপ' },
  website: { en: 'Website or Forum', bn: 'ওয়েবসাইট বা ফোরাম' },
  in_person: { en: 'In Person / Offline', bn: 'সরাসরি / অফলাইন' },
  other: { en: 'Other Channel', bn: 'অন্যান্য মাধ্যম' },
};

export interface HarassmentContextCardProps {
  complaint: Complaint;
}

export const HarassmentContextCard: React.FC<HarassmentContextCardProps> = ({ complaint }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (complaint.categoryId !== 'harassment') return null;

  const rows = [
    complaint.relationshipContext
      ? {
          key: 'relationship',
          label: isBn ? 'সম্পর্কের অতিরিক্ত প্রসঙ্গ' : 'Additional relationship context',
          value: complaint.relationshipContext,
        }
      : null,
    complaint.intimateWhatHappened
      ? {
          key: 'action',
          label: isBn ? 'কী ঘটেছে / কী হুমকি দেওয়া হচ্ছে' : 'Threat status / action',
          value:
            ACTION_LABELS[complaint.intimateWhatHappened]?.[isBn ? 'bn' : 'en'] ||
            complaint.intimateWhatHappened,
        }
      : null,
    complaint.intimatePlatform
      ? {
          key: 'platform',
          label: isBn ? 'মাধ্যম / প্ল্যাটফর্ম' : 'Platform / channel',
          value:
            PLATFORM_LABELS[complaint.intimatePlatform]?.[isBn ? 'bn' : 'en'] ||
            complaint.intimatePlatform,
        }
      : null,
  ].filter((row): row is { key: string; label: string; value: string } => Boolean(row));

  if (rows.length === 0) return null;

  return (
    <Card variant="default">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>{isBn ? 'হয়রানির অতিরিক্ত প্রসঙ্গ' : 'Additional Harassment Context'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((row) => (
            <div key={row.key} className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">{row.label}</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">
                {row.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 type-meta text-slate-400 dark:text-slate-500">
          {isBn
            ? 'নাগরিকের জমা দেওয়া প্রসঙ্গ; অ্যাডমিন ভিউতে শুধু-পঠনযোগ্য।'
            : 'Citizen-submitted context; read-only in the Admin view.'}
        </p>
      </CardContent>
    </Card>
  );
};

export default HarassmentContextCard;
