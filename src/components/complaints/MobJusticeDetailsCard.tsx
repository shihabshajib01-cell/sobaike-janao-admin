import React from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import {
  MobJusticeDetails,
  MobJusticeOngoingStatus,
  MobJusticeOutcome,
  MobJusticeSpread,
  MobJusticeTrigger,
} from '@/types/Complaint';

export interface MobJusticeDetailsCardProps {
  details?: MobJusticeDetails | null;
}

const TRIGGER_LABELS: Record<MobJusticeTrigger, { en: string; bn: string }> = {
  suspected_theft_robbery: { en: 'Suspected theft / robbery', bn: 'চুরি বা ডাকাতির সন্দেহ' },
  snatching_allegation: { en: 'Snatching allegation', bn: 'ছিনতাইয়ের অভিযোগ' },
  kidnapping_allegation: { en: 'Kidnapping / child-abduction allegation', bn: 'অপহরণ / শিশু অপহরণের অভিযোগ' },
  sexual_offence_allegation: { en: 'Sexual harassment / sexual-violence allegation', bn: 'যৌন হয়রানি / যৌন সহিংসতার অভিযোগ' },
  religious_sentiment_allegation: { en: 'Religious-sentiment allegation', bn: 'ধর্মীয় অনুভূতিতে আঘাতের অভিযোগ' },
  personal_local_dispute: { en: 'Personal / local dispute', bn: 'ব্যক্তিগত / স্থানীয় বিরোধ' },
  informal_punishment: { en: 'Village arbitration / informal punishment', bn: 'সালিশ / স্থানীয়ভাবে শাস্তি দেওয়ার চেষ্টা' },
  other_accusation_dispute: { en: 'Other accusation / dispute', bn: 'অন্যান্য অভিযোগ বা বিরোধ' },
  unknown: { en: 'Unknown', bn: 'কারণ জানা নেই' },
};

const SPREAD_LABELS: Record<MobJusticeSpread, { en: string; bn: string }> = {
  direct_accusation: { en: 'Direct accusation at the location', bn: 'ঘটনাস্থলে সরাসরি অভিযোগ' },
  word_of_mouth: { en: 'Word-of-mouth rumor', bn: 'মুখে মুখে গুজব / খবর' },
  social_media: { en: 'Social media', bn: 'ফেসবুক / সামাজিক যোগাযোগমাধ্যম' },
  message_group_post: { en: 'Message / group / online post', bn: 'মেসেজ / গ্রুপ / অনলাইন পোস্ট' },
  loudspeaker_announcement: { en: 'Loudspeaker / public announcement', bn: 'মাইক / লাউডস্পিকার / প্রকাশ্য ঘোষণা' },
  local_arbitration_meeting: { en: 'Local arbitration / meeting', bn: 'সালিশ / স্থানীয় বৈঠক' },
  organized_gathering: { en: 'Organized gathering / call', bn: 'সংগঠিতভাবে লোক জড়ো করা হয়েছিল' },
  unknown: { en: 'Unknown', bn: 'জানা নেই' },
  other: { en: 'Other', bn: 'অন্যান্য' },
};

const OUTCOME_LABELS: Record<MobJusticeOutcome, { en: string; bn: string }> = {
  threatened_harassed: { en: 'Threatened / harassed', bn: 'হুমকি / হয়রানি করা হয়েছে' },
  restrained_surrounded: { en: 'Restrained / surrounded', bn: 'আটক / ঘেরাও করা হয়েছে' },
  physically_assaulted: { en: 'Physically assaulted', bn: 'মারধর করা হয়েছে' },
  seriously_injured: { en: 'Seriously injured', bn: 'গুরুতর আহত' },
  death_reported: { en: 'Death reported', bn: 'মৃত্যু হয়েছে' },
  property_damaged: { en: 'Property attacked / damaged', bn: 'সম্পত্তি ভাঙচুর / ক্ষতি করা হয়েছে' },
  rescued_intervention: { en: 'Rescued / intervention occurred', bn: 'পুলিশ / অন্যরা উদ্ধার করেছে' },
  ongoing: { en: 'Incident ongoing', bn: 'ঘটনা এখনো চলছে' },
  unknown: { en: 'Outcome unknown', bn: 'ফলাফল জানা নেই' },
};

const ONGOING_LABELS: Record<MobJusticeOngoingStatus, { en: string; bn: string }> = {
  ongoing: { en: 'Yes, still ongoing', bn: 'হ্যাঁ, এখনো চলছে' },
  ended: { en: 'No, ended', bn: 'না, শেষ হয়েছে' },
  unknown: { en: 'Not sure', bn: 'নিশ্চিত নই' },
};

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">{value}</p>
  </div>
);

export const MobJusticeDetailsCard: React.FC<MobJusticeDetailsCardProps> = ({ details }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <Card variant="default" className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>{isBn ? 'মব সহিংসতার বিস্তারিত' : 'Mob Justice Details'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {!details ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              {isBn
                ? 'এই মব সহিংসতার অভিযোগে শ্রেণিবদ্ধ বিস্তারিত তথ্য পাওয়া যায়নি।'
                : 'Structured Mob Justice details are not available for this complaint.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailItem
              label={isBn ? 'ঘটনার কারণ / অভিযোগ' : 'Trigger / allegation'}
              value={isBn ? TRIGGER_LABELS[details.trigger].bn : TRIGGER_LABELS[details.trigger].en}
            />
            <DetailItem
              label={isBn ? 'অভিযোগ বা ডাক ছড়ানোর মাধ্যম' : 'How the accusation / call spread'}
              value={
                details.spread
                  ? isBn
                    ? SPREAD_LABELS[details.spread].bn
                    : SPREAD_LABELS[details.spread].en
                  : isBn
                  ? 'তথ্য দেওয়া হয়নি'
                  : 'Not provided'
              }
            />
            <DetailItem
              label={isBn ? 'ঘটনার ফলাফল' : 'Incident outcome'}
              value={isBn ? OUTCOME_LABELS[details.outcome].bn : OUTCOME_LABELS[details.outcome].en}
            />
            <DetailItem
              label={isBn ? 'বর্তমান অবস্থা' : 'Current status'}
              value={
                isBn
                  ? ONGOING_LABELS[details.ongoingStatus].bn
                  : ONGOING_LABELS[details.ongoingStatus].en
              }
            />
            <DetailItem
              label={isBn ? 'লক্ষ্য হওয়া ব্যক্তির সংখ্যা' : 'People targeted'}
              value={
                details.targetedCount ?? (isBn ? 'তথ্য দেওয়া হয়নি' : 'Not provided')
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MobJusticeDetailsCard;
