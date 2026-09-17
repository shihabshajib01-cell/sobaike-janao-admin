import { supabase } from '@/lib/supabase';

export type BannerCategoryKey =
  | 'harassment'
  | 'extortion'
  | 'public_safety'
  | 'road_transport'
  | 'load_shedding'
  | 'illegal_occupation'
  | 'rickshaw';

export interface BannerContent {
  titleBn: string;
  titleEn: string;
  mobileDescriptionBn: string;
  mobileDescriptionEn: string;
  tabletDescriptionBn: string;
  tabletDescriptionEn: string;
  desktopDescriptionBn: string;
  desktopDescriptionEn: string;
  illustrationSrc: string;
  primaryCtaBn: string;
  primaryCtaEn: string;
  showOnHome: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface ManagedBanner {
  categoryKey: BannerCategoryKey;
  draftContent: BannerContent;
  publishedContent: BannerContent;
  draftUpdatedAt: string;
  draftUpdatedBy: string | null;
  publishedAt: string;
  publishedBy: string | null;
  version: number;
}

interface BannerRpcRow {
  category_key: BannerCategoryKey;
  draft_content: BannerContent;
  published_content: BannerContent;
  draft_updated_at: string;
  draft_updated_by: string | null;
  published_at: string;
  published_by: string | null;
  version: number;
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const getExtension = (mime: string): string => {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  return 'img';
};

const normalizeContent = (content: BannerContent): BannerContent => ({
  ...content,
  titleBn: content.titleBn.trim(),
  titleEn: content.titleEn.trim(),
  mobileDescriptionBn: content.mobileDescriptionBn.trim(),
  mobileDescriptionEn: content.mobileDescriptionEn.trim(),
  tabletDescriptionBn: content.tabletDescriptionBn.trim(),
  tabletDescriptionEn: content.tabletDescriptionEn.trim(),
  desktopDescriptionBn: content.desktopDescriptionBn.trim(),
  desktopDescriptionEn: content.desktopDescriptionEn.trim(),
  illustrationSrc: content.illustrationSrc.trim(),
  primaryCtaBn: content.primaryCtaBn.trim(),
  primaryCtaEn: content.primaryCtaEn.trim(),
  sortOrder: Math.max(1, Math.min(99, Math.trunc(Number(content.sortOrder) || 1))),
});

const uploadImage = async (
  categoryKey: BannerCategoryKey,
  file: File
): Promise<{ publicUrl: string; path: string }> => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Only JPG, PNG, WebP, and AVIF banner images are allowed.');
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Banner image must be 5 MB or smaller.');
  }

  const extension = getExtension(file.type);
  const uniqueId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${categoryKey}/${uniqueId}.${extension}`;

  const { error } = await supabase.storage.from('banner-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message || 'Banner image upload failed.');

  const { data } = supabase.storage.from('banner-media').getPublicUrl(path);
  if (!data?.publicUrl) {
    await supabase.storage.from('banner-media').remove([path]);
    throw new Error('Could not resolve the uploaded banner image URL.');
  }

  return { publicUrl: data.publicUrl, path };
};

export const bannerApi = {
  async getAll(): Promise<ManagedBanner[]> {
    const { data, error } = await supabase.rpc('admin_get_site_banners');
    if (error) throw new Error(error.message || 'Failed to load banners.');

    return ((data || []) as BannerRpcRow[]).map((row) => ({
      categoryKey: row.category_key,
      draftContent: row.draft_content,
      publishedContent: row.published_content,
      draftUpdatedAt: row.draft_updated_at,
      draftUpdatedBy: row.draft_updated_by,
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      version: row.version,
    }));
  },

  async saveDraft(
    categoryKey: BannerCategoryKey,
    content: BannerContent,
    imageFile?: File | null
  ): Promise<BannerContent> {
    let uploadedPath: string | null = null;
    let nextContent = normalizeContent(content);

    try {
      if (imageFile) {
        const uploaded = await uploadImage(categoryKey, imageFile);
        uploadedPath = uploaded.path;
        nextContent = { ...nextContent, illustrationSrc: uploaded.publicUrl };
      }

      const { error } = await supabase.rpc('admin_save_banner_draft', {
        p_category_key: categoryKey,
        p_content: nextContent,
      });
      if (error) throw new Error(error.message || 'Failed to save banner draft.');

      return nextContent;
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from('banner-media').remove([uploadedPath]);
      }
      throw error;
    }
  },

  async publish(categoryKey: BannerCategoryKey): Promise<void> {
    const { error } = await supabase.rpc('admin_publish_banner', {
      p_category_key: categoryKey,
    });
    if (error) throw new Error(error.message || 'Failed to publish banner.');
  },
};

export default bannerApi;
