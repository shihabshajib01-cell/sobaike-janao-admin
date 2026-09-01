import React from 'react';
import { FeedPost } from '@/types/Post';
import { useLanguage } from '@/context/LanguageContext';
import { getAvailableFeedActions, FeedActionId, FeedActionConfig } from '@/utils/feedActions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FeedMediaPreview } from './FeedMediaPreview';
import {
  Edit,
  Globe,
  XCircle,
  EyeOff,
  MapPin,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/utils';

export interface FeedTableProps {
  posts: FeedPost[];
  onSelectPost: (post: FeedPost) => void;
  onEditPost?: (post: FeedPost) => void;
  onAction?: (actionId: FeedActionId, post: FeedPost) => void;
  isLoading?: boolean;
  className?: string;
}

export const FeedTable: React.FC<FeedTableProps> = ({
  posts,
  onSelectPost,
  onEditPost,
  onAction,
  isLoading,
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
          {isBn ? 'লাইভ প্রকাশিত' : 'Published / Live'}
        </Badge>
      );
    }
    return (
      <Badge status="default" size="sm">
        {isBn ? 'অপ্রকাশিত' : 'Unpublished'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        <div className="inline-block animate-spin w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full mb-2" />
        <p>{isBn ? 'ফিড তথ্য লোড হচ্ছে...' : 'Loading public feed records...'}</p>
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
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs', className)}>
      <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
        <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="py-3 px-4 w-[110px]">{isBn ? 'পোস্ট আইডি' : 'Post ID'}</th>
            <th className="py-3 px-4 min-w-[260px]">{isBn ? 'শিরোনাম ও বিবরণ' : 'Title & Content Preview'}</th>
            <th className="py-3 px-4 w-[150px]">{isBn ? 'ক্যাটাগরি' : 'Category'}</th>
            <th className="py-3 px-4 w-[110px]">{isBn ? 'মিডিয়া' : 'Media'}</th>
            <th className="py-3 px-4 w-[130px]">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
            <th className="py-3 px-4 w-[110px]">{isBn ? 'তারিখ' : 'Date'}</th>
            <th className="py-3 px-4 min-w-[220px] text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {posts.map((post) => {
            const availableActions = getAvailableFeedActions(post.status);

            return (
              <tr
                key={post.id}
                onClick={() => onSelectPost(post)}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                {/* ID & Ref */}
                <td className="py-3.5 px-4 align-top font-mono font-medium text-slate-900 dark:text-slate-100">
                  <div className="space-y-1">
                    <span className="text-sky-600 dark:text-sky-400 font-semibold">{post.id}</span>
                    {post.complaintId && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        {post.complaintId}
                      </div>
                    )}
                  </div>
                </td>

                {/* Title & Preview */}
                <td className="py-3.5 px-4 align-top max-w-sm">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      <span>{isBn ? post.titleBn || post.titleEn : post.titleEn || post.titleBn}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {isBn ? post.contentBn || post.contentEn : post.contentEn || post.contentBn}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {post.location.ward}
                      </span>
                      {(post.upvotesCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {post.upvotesCount}
                        </span>
                      )}
                      {(post.commentsCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {post.commentsCount}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="py-3.5 px-4 align-top">
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {isBn ? post.categoryBn : post.categoryEn}
                    </div>
                    {post.subcategoryEn && (
                      <div className="text-[10px] text-slate-400">
                        {isBn ? post.subcategoryBn : post.subcategoryEn}
                      </div>
                    )}
                  </div>
                </td>

                {/* Media preview indicator */}
                <td className="py-3.5 px-4 align-top">
                  <FeedMediaPreview media={post.media} variant="compact" />
                </td>

                {/* Status */}
                <td className="py-3.5 px-4 align-top">{getStatusBadge(post.status)}</td>

                {/* Date */}
                <td className="py-3.5 px-4 align-top text-[11px] text-slate-500 font-mono">
                  {new Date(post.createdAt).toLocaleDateString()}
                </td>

                {/* Action Column strictly rendered from getAvailableFeedActions(post.status) */}
                <td className="py-3.5 px-4 align-top text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {availableActions.map((action) => (
                      <Button
                        key={action.id}
                        variant={action.id === 'edit' ? 'ghost' : action.variant === 'primary' ? 'secondary' : 'ghost'}
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
                          'text-xs h-7 px-2',
                          action.id === 'edit' && 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100',
                          action.id === 'approve_publish' && 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-medium',
                          (action.id === 'reject' || action.id === 'hide_feed') && 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                        )}
                      >
                        {getActionIcon(action.iconName)}
                        <span>{isBn ? action.labelBn : action.labelEn}</span>
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FeedTable;
