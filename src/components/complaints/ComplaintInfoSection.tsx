import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { Complaint } from '@/types/Complaint';
import {
  FileText,
  User,
  ShieldCheck,
  Phone,
  Layers,
  Globe2,
  Lock,
} from 'lucide-react';
import { cn } from '@/utils';

export interface ComplaintInfoSectionProps {
  complaint: Complaint;
  className?: string;
}

export const ComplaintInfoSection: React.FC<ComplaintInfoSectionProps> = ({
  complaint,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Allow switching description language tab or viewing both
  const [descLangTab, setDescLangTab] = useState<'both' | 'bn' | 'en'>('both');

  return (
    <div className={cn('space-y-6', className)}>
      {/* 1. Description Section */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>{isBn ? 'অভিযোগের মূল বিবরণ' : 'Complaint Narrative & Statement'}</span>
          </CardTitle>

          {/* Language display switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs">
            <button
              type="button"
              onClick={() => setDescLangTab('both')}
              className={cn(
                'px-2 py-1 rounded transition-colors text-xs font-medium',
                descLangTab === 'both'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              {isBn ? 'উভয় ভাষা' : 'Both (EN & BN)'}
            </button>
            <button
              type="button"
              onClick={() => setDescLangTab('bn')}
              className={cn(
                'px-2 py-1 rounded transition-colors text-xs font-medium',
                descLangTab === 'bn'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              {isBn ? 'বাংলা' : 'Bengali'}
            </button>
            <button
              type="button"
              onClick={() => setDescLangTab('en')}
              className={cn(
                'px-2 py-1 rounded transition-colors text-xs font-medium',
                descLangTab === 'en'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              {isBn ? 'ইংরেজি' : 'English'}
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Primary Subject Title */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              {isBn ? 'অভিযোগের শিরোনাম' : 'Subject Heading'}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {isBn ? complaint.titleBn || complaint.titleEn : complaint.titleEn || complaint.titleBn}
            </h3>
            {descLangTab === 'both' && complaint.titleBn && complaint.titleEn && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                {isBn ? complaint.titleEn : complaint.titleBn}
              </p>
            )}
          </div>

          {/* Description Content */}
          <div className="space-y-4 pt-2">
            {(descLangTab === 'both' || descLangTab === 'bn') && complaint.descriptionBn && (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBn ? 'বাংলা বিবরণ' : 'Bengali Submission Statement'}</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {complaint.descriptionBn}
                </p>
              </div>
            )}

            {(descLangTab === 'both' || descLangTab === 'en') && complaint.descriptionEn && (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Globe2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>{isBn ? 'ইংরেজি বিবরণ / অনুবাদ' : 'English Submission Statement'}</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {complaint.descriptionEn}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Reporter Information & Verification Card */}
      <Card variant="default">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{isBn ? 'আবেদনকারী নাগরিকের তথ্য' : 'Citizen Reporter Information'}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Identity Status */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                {isBn ? 'নাগরিক পরিচয় ধরন' : 'Submission Identity Mode'}
              </span>
              <div className="pt-0.5">
                {complaint.isAnonymous ? (
                  <Badge status="default" size="md">
                    <Lock className="w-3 h-3 mr-1 text-slate-400" />
                    {isBn ? 'গোপনীয় / বেনামে দাখিলকৃত' : 'Anonymous Citizen Submission'}
                  </Badge>
                ) : (
                  <Badge status="approved" size="md">
                    <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" />
                    {isBn ? 'যাচাইকৃত নাগরিক' : 'Verified Citizen'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Reporter Name (Only if available / not anonymous) */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isBn ? 'নাগরিকের নাম' : 'Citizen Name'}
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {complaint.isAnonymous
                  ? isBn
                    ? 'বেনামী নাগরিক (সুরক্ষিত)'
                    : 'Anonymous Citizen (Protected)'
                  : complaint.citizenName || (isBn ? 'নাম প্রকাশে অনিচ্ছুক' : 'Not provided')}
              </p>
            </div>

            {/* Contact Phone (Only if provided, masked for privacy) */}
            {!complaint.isAnonymous && complaint.citizenPhone && (
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {isBn ? 'যোগাযোগ নম্বর' : 'Contact Phone'}
                </span>
                <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">
                  {complaint.citizenPhone}
                </p>
              </div>
            )}

            {/* Platform Trust & Protection Note */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isBn ? 'নাগরিক সুরক্ষা প্রোটোকল' : 'Data Privacy Standard'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isBn
                  ? 'সবাইকে জানাও প্ল্যাটফর্মের গোপনীয়তা নীতি অনুযায়ী নাগরিক সংবেদনশীল তথ্য সুরক্ষিত থাকে।'
                  : 'Protected according to Sobai Ke Janao Citizen Whistleblower Privacy Standard.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplaintInfoSection;
