import React, { useState } from 'react';
import { ComplaintMedia } from '@/types/Complaint';
import { useLanguage } from '@/context/LanguageContext';
import { Modal } from '@/components/ui/Modal';
import { Image, FileText, Maximize2, Layers, AlertCircle } from 'lucide-react';
import { cn } from '@/utils';

export interface FeedMediaPreviewProps {
  media: ComplaintMedia[];
  title?: string;
  className?: string;
  variant?: 'compact' | 'expanded' | 'gallery';
}

export const FeedMediaPreview: React.FC<FeedMediaPreviewProps> = ({
  media = [],
  title,
  className,
  variant = 'expanded',
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Case 1: Text Only (No media attached)
  if (!media || media.length === 0) {
    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
          <FileText className="w-3.5 h-3.5" />
          <span>{isBn ? 'টেক্সট' : 'Text'}</span>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2',
          className
        )}
      >
        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
        <span>
          {isBn
            ? 'এই পোস্টে কোনো ছবি বা মিডিয়া প্রমাণ যুক্ত নেই (শুধুমাত্র টেক্সট বিবরণ)।'
            : 'Text-only post without attached photographic media.'}
        </span>
      </div>
    );
  }

  // Case 2: Single Image
  if (media.length === 1) {
    const singleMedia = media[0];
    const hasFailed = failedImages[singleMedia.id];

    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
            {!hasFailed ? (
              <img
                src={singleMedia.url}
                alt={singleMedia.caption || 'Post media'}
                referrerPolicy="no-referrer"
                onError={() => handleImageError(singleMedia.id)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Image className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">1 photo</span>
        </div>
      );
    }

    return (
      <>
        <div className={cn('space-y-1.5', className)}>
          <div
            onClick={() => !hasFailed && setLightboxIndex(0)}
            className={cn(
              'group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900',
              !hasFailed && 'cursor-pointer'
            )}
          >
            {!hasFailed ? (
              <>
                <img
                  src={singleMedia.url}
                  alt={singleMedia.caption || title || 'Post media'}
                  referrerPolicy="no-referrer"
                  onError={() => handleImageError(singleMedia.id)}
                  className="w-full max-h-72 object-cover object-center group-hover:scale-[1.01] transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="px-2.5 py-1 rounded-md bg-black/70 text-white text-xs font-medium flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" />
                    {isBn ? 'বড় করে দেখুন' : 'Expand Image'}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-400" />
                <span className="text-xs">
                  {isBn ? 'ছবি লোড করা যায়নি' : 'Unable to preview photo'}
                </span>
              </div>
            )}
          </div>

          {singleMedia.caption && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic px-1">
              "{singleMedia.caption}"
            </p>
          )}
        </div>

        {/* Lightbox Modal */}
        {lightboxIndex !== null && (
          <Modal
            isOpen={lightboxIndex !== null}
            onClose={() => setLightboxIndex(null)}
            title={title || (isBn ? 'ছবি প্রিভিউ' : 'Media Preview')}
            size="lg"
          >
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
                <img
                  src={media[lightboxIndex].url}
                  alt={media[lightboxIndex].caption || 'Expanded preview'}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              {media[lightboxIndex].caption && (
                <p className="text-xs text-slate-600 dark:text-slate-300 text-center font-medium">
                  {media[lightboxIndex].caption}
                </p>
              )}
            </div>
          </Modal>
        )}
      </>
    );
  }

  // Case 3: Multiple Images (Gallery Layout)
  if (variant === 'compact') {
    const firstMedia = media[0];
    const hasFailed = failedImages[firstMedia.id];

    return (
      <div className="flex items-center gap-1.5">
        <div className="relative w-8 h-8 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
          {!hasFailed ? (
            <img
              src={firstMedia.url}
              alt="Gallery thumbnail"
              referrerPolicy="no-referrer"
              onError={() => handleImageError(firstMedia.id)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono font-medium">
          {media.length} {isBn ? 'ছবি' : 'photos'}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>
              {isBn
                ? `সংযুক্ত ছবির গ্যালারি (${media.length}টি ছবি)`
                : `Attached Photo Gallery (${media.length} items)`}
            </span>
          </span>
          <span className="text-[11px] text-slate-400">
            {isBn ? 'বড় করে দেখতে ক্লিক করুন' : 'Click to inspect'}
          </span>
        </div>

        {/* Gallery Grid */}
        <div
          className={cn(
            'grid gap-2',
            media.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          )}
        >
          {media.map((item, idx) => {
            const hasFailed = failedImages[item.id];
            return (
              <div
                key={item.id || idx}
                onClick={() => !hasFailed && setLightboxIndex(idx)}
                className={cn(
                  'group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-4/3 bg-slate-100 dark:bg-slate-900',
                  !hasFailed && 'cursor-pointer'
                )}
              >
                {!hasFailed ? (
                  <>
                    <img
                      src={item.url}
                      alt={item.caption || `Gallery photo ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(item.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <Modal
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          title={title || (isBn ? 'ছবির গ্যালারি প্রিভিউ' : 'Gallery Inspection')}
          size="lg"
        >
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img
                src={media[lightboxIndex].url}
                alt={media[lightboxIndex].caption || 'Expanded preview'}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                {isBn
                  ? `ছবি ${lightboxIndex + 1} / ${media.length}`
                  : `Photo ${lightboxIndex + 1} of ${media.length}`}
              </span>
              {media[lightboxIndex].caption && (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {media[lightboxIndex].caption}
                </span>
              )}
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
              {media.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={cn(
                    'w-12 h-12 rounded-md overflow-hidden shrink-0 border-2 transition-all',
                    lightboxIndex === idx
                      ? 'border-sky-500 ring-2 ring-sky-500/30 scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <img
                    src={item.url}
                    alt="thumb"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default FeedMediaPreview;
