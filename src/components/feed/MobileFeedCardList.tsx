import React from 'react';
import { FeedPost } from '@/types/Post';
import { useLanguage } from '@/context/LanguageContext';
import { getAvailableFeedActions, FeedActionId, FeedActionConfig } from '@/utils/feedActions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeedMediaPreview } from './FeedMediaPreview';
import {
  MapPin,
  Calendar,
  ThumbsUp,
  MessageSquare,
  ChevronRight,
  Edit,
  Globe,
  XCircle,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/utils';

export interface MobileFeedCardListProps {
  posts: FeedPost[];
  onSelectPost: (post: FeedPost) => void;
  onEditPost?: (post: FeedPost) => void;
  onAction?: (actionId: FeedActionId, post: FeedPost) => void;
  isLoading?: boolean;
  className?: string;
}

export const MobileFeedCardList: React.FC<MobileFeedCardListProps> = ({
  posts,
  onSelectPost,
  onEditPost,
  onAction,
  isLoading = false,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getActionIcon = (iconName: FeedActionConfig['iconName']) => {
    switch (iconName) {
      case 'Edit':
        return <Edit className="w-3.5 h-3.5 mr-1" />;
      case 'Globe':
        return <Globe className="w-3.5 h-3.5 mr-1" />;
      case 'XCircle':
        return <XCircle className="w-3.5 h-3.5 mr-1" />;
      case 'EyeOff':
        return <EyeOff className="w-3.5 h-3.5 mr-1" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: FeedPost['status']) => {
    if (status === 'published') {
      return (
        <Badge status="published" size="sm" dot>
          {isBn ? 'লাইভ প্রকাশিত' : 'Published'}
        </Badge>
      );
    }
    return (
      <Badge status="default" size="sm">
        {isBn ? 'অপ্রকাশিত' : 'Unpublished'}
      </Badge>
    );
  };

  const formatDate = (isoString: string): string => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 space-y-3 animate-pulse border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
        <p>{isBn ? 'কোনো ফিড পোস্ট পাওয়া যায়নি' : 'No feed posts found'}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {posts.map((post) => {
        const title = isBn ? post.titleBn || post.titleEn : post.titleEn || post.titleBn;
        const category = isBn ? post.categoryBn : post.categoryEn;
        const subcategory = isBn ? post.subcategoryBn : post.subcategoryEn;
        const availableActions = getAvailableFeedActions(post.status);

        return (
          <Card
            key={post.id}
            variant="default"
            padding="none"
            onClick={() => onSelectPost(post)}
            className={cn(
              'w-full text-left transition-all overflow-hidden border border-slate-200 dark:border-slate-800',
              'hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.99] cursor-pointer'
            )}
          >
            <div className="p-4 space-y-2.5">
              {/* Header: ID + Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-400 text-xs">
                    {post.id}
                  </span>
                  {post.complaintId && (
                    <span className="font-mono text-[10px] text-slate-400">
                      {post.complaintId}
                    </span>
                  )}
                </div>
                <div>{getStatusBadge(post.status)}</div>
              </div>

              {/* Main: Title & Content Preview */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                  {title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {isBn ? post.contentBn || post.contentEn : post.contentEn || post.contentBn}
                </p>
              </div>

              {/* Category & Media thumbnail */}
              <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                    {category} {subcategory ? `• ${subcategory}` : ''}
                  </span>
                </div>
                <FeedMediaPreview media={post.media} variant="compact" />
              </div>

              {/* Meta Row: Location + Date + Metrics */}
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{post.location.ward}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px]">
                  {(post.upvotesCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-slate-400" />
                      {post.upvotesCount}
                    </span>
                  )}
                  {(post.commentsCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-slate-400" />
                      {post.commentsCount}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action Row strictly rendered from getAvailableFeedActions(post.status) */}
              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {availableActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAction) {
                          onAction(action.id, post);
                        } else if (action.id === 'edit' && onEditPost) {
                          onEditPost(post);
                        } else {
                          onSelectPost(post);
                        }
                      }}
                      className={cn(
                        'text-xs h-7 px-2 min-h-[30px]',
                        action.id === 'edit' && 'text-slate-600 dark:text-slate-300 hover:text-slate-900',
                        action.id === 'approve_publish' && 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-medium',
                        (action.id === 'reject' || action.id === 'hide_feed') && 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
                      )}
                    >
                      {getActionIcon(action.iconName)}
                      <span>{isBn ? action.labelBn : action.labelEn}</span>
                    </Button>
                  ))}
                </div>

                <div className="flex items-center text-sky-600 dark:text-sky-400 text-xs font-medium shrink-0 ml-auto pl-1">
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileFeedCardList;
