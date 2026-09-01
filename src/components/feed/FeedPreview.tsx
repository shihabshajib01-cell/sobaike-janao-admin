import React from 'react';
import { FeedPost } from '@/types/Post';
import { useLanguage } from '@/context/LanguageContext';
import { FeedMediaPreview } from './FeedMediaPreview';
import { Badge } from '@/components/ui/Badge';
import {
  ThumbsUp,
  MessageSquare,
  Share2,
  MapPin,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/utils';

export interface FeedPreviewProps {
  post: FeedPost;
  className?: string;
}

export const FeedPreview: React.FC<FeedPreviewProps> = ({ post, className }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs',
        className
      )}
    >
      {/* Feed Card Top Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          {/* Author avatar & attribution */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-300 font-semibold text-xs shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {isBn ? post.authorDisplayBn : post.authorDisplayEn}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>
                  {post.location.ward} • {post.location.zone}
                </span>
              </div>
            </div>
          </div>

          {/* Badges: Category */}
          <div className="flex flex-col items-end gap-1">
            <Badge status="info" size="sm" className="text-[10px]">
              {isBn ? post.categoryBn : post.categoryEn}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {isBn ? post.titleBn || post.titleEn : post.titleEn || post.titleBn}
        </h4>

        {/* Description / Content Statement */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {isBn ? post.contentBn || post.contentEn : post.contentEn || post.contentBn}
        </p>

        {/* Media Preview (Gallery / Single Image / Text only) */}
        {post.media && post.media.length > 0 && (
          <div className="pt-1">
            <FeedMediaPreview
              media={post.media}
              title={isBn ? post.titleBn : post.titleEn}
            />
          </div>
        )}
      </div>

      {/* Citizen Interaction / Engagement Metrics Bar */}
      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-sky-700 dark:text-sky-400">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span className="tabular-nums">{post.upvotesCount}</span>
            <span className="text-[11px] text-slate-500">{isBn ? 'সমর্থন' : 'Upvotes'}</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="tabular-nums">{post.commentsCount}</span>
            <span className="text-[11px] text-slate-500">{isBn ? 'মন্তব্য' : 'Comments'}</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
            <Share2 className="w-3.5 h-3.5" />
            <span className="tabular-nums">{post.sharesCount}</span>
            <span className="text-[11px] text-slate-500">{isBn ? 'শেয়ার' : 'Shares'}</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          {new Date(post.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default FeedPreview;
