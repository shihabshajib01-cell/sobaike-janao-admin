import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import {
  FeedPost,
  FeedFilterState,
  FeedStatusFilter,
} from '@/types/Post';
import { FeedActionId } from '@/utils/feedActions';
import { feedApi } from '@/services/api';
import {
  FeedStatusTabs,
  FeedSearch,
  FeedFilters,
  FeedTable,
  MobileFeedCardList,
  FeedDetailDrawer,
  FeedEmptyState,
} from '@/components/feed';
import {
  RefreshCw,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

const INITIAL_FILTERS: FeedFilterState = {
  search: '',
  status: 'all',
  categoryId: 'all',
  subcategoryId: 'all',
  hasMedia: 'all',
  ward: 'all',
  dateRange: {},
};

export const FeedPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<FeedFilterState>(INITIAL_FILTERS);
  const [statusCounts, setStatusCounts] = useState<Record<FeedStatusFilter, number>>({
    all: 0,
    unpublished: 0,
    published: 0,
  });

  // Selected post for detail drawer
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [initialEditMode, setInitialEditMode] = useState(false);

  // Filter expand toggle for mobile
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Fetch feed items
  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await feedApi.getPosts(filters, currentPage, pageSize);
      setPosts(response.posts);
      setTotalPosts(response.total);
      setTotalPages(response.totalPages);
      setStatusCounts(response.statusCounts);

      // If drawer is open, keep selected post fresh
      if (selectedPost) {
        const fresh = response.posts.find((p) => p.id === selectedPost.id);
        if (fresh) setSelectedPost(fresh);
      }
    } catch (error) {
      console.error('Failed to load feed posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize, selectedPost]);

  useEffect(() => {
    loadPosts();
  }, [filters, currentPage]);

  const handleStatusTabChange = (status: FeedStatusFilter) => {
    setFilters((prev) => ({ ...prev, status }));
    setCurrentPage(1);
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: FeedFilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
  };

  const handleSelectPost = (post: FeedPost) => {
    setSelectedPost(post);
    setInitialEditMode(false);
    setIsDrawerOpen(true);
  };

  const handleEditPost = (post: FeedPost) => {
    setSelectedPost(post);
    setInitialEditMode(true);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setInitialEditMode(false);
  };

  // Workflow Handlers
  const handlePublish = async (postId: string) => {
    const res = await feedApi.publishPost(postId);
    setSelectedPost(res.post);
    await loadPosts();
  };

  const handleUnpublish = async (postId: string, reason: string) => {
    const res = await feedApi.unpublishPost(postId, reason);
    setSelectedPost(res.post);
    await loadPosts();
  };

  const handleReject = async (postId: string, reason: string, explanation: string) => {
    const res = await feedApi.rejectPost(postId, reason, explanation);
    setSelectedPost(res.post);
    await loadPosts();
  };

  const handleUpdate = async (postId: string, updates: Partial<FeedPost>) => {
    const updated = await feedApi.updatePost(postId, updates);
    setSelectedPost(updated);
    await loadPosts();
  };

  const handleFeedAction = async (actionId: FeedActionId, post: FeedPost) => {
    switch (actionId) {
      case 'edit':
        handleEditPost(post);
        break;
      case 'approve_publish':
        await handlePublish(post.id);
        break;
      case 'reject':
        setSelectedPost(post);
        setIsDrawerOpen(true);
        break;
      case 'hide_feed':
        setSelectedPost(post);
        setIsDrawerOpen(true);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title={isBn ? 'পাবলিক ফিড ব্যবস্থাপনা' : 'Public Feed'}
        description={
          isBn
            ? 'পাবলিক প্ল্যাটফর্মে প্রকাশিত নাগরিক অভিযোগ ও তথ্যের স্বচ্ছতা ও মডারেশন পরিচালনা করুন।'
            : 'Manage content published on the public platform.'
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Create Post placeholder */}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
              disabled
              title={
                isBn
                  ? 'সরাসরি পোস্ট তৈরি পরবর্তী ফেজে উন্মুক্ত হবে'
                  : 'Manual post authoring prepared for upcoming release'
              }
              className="text-xs opacity-70"
            >
              {isBn ? 'নতুন পোস্ট তৈরি' : 'Create Post'}
            </Button>

            {/* Refresh */}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadPosts}
              className="text-xs"
            >
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* 2. Content Status Tabs */}
      <FeedStatusTabs
        activeTab={filters.status}
        onChange={handleStatusTabChange}
        counts={statusCounts}
      />

      {/* 3. Search + Filters Control Area */}
      <Card variant="default">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <FeedSearch value={filters.search} onChange={handleSearchChange} />

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFiltersMobile((prev) => !prev)}
                className="sm:hidden text-xs"
                leftIcon={<Filter className="w-3.5 h-3.5" />}
              >
                {isBn ? 'ফিল্টার' : 'Filters'}
              </Button>
            </div>
          </div>

          <div className={`pt-1 ${showFiltersMobile ? 'block' : 'hidden sm:block'}`}>
            <FeedFilters
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Post Table / Grid */}
      {posts.length > 0 ? (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <FeedTable
              posts={posts}
              onSelectPost={handleSelectPost}
              onEditPost={handleEditPost}
              onAction={handleFeedAction}
              isLoading={isLoading}
            />
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden">
            <MobileFeedCardList
              posts={posts}
              onSelectPost={handleSelectPost}
              onEditPost={handleEditPost}
              onAction={handleFeedAction}
              isLoading={isLoading}
            />
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
              <div>
                <span>
                  {isBn ? 'মোট' : 'Showing'}{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {posts.length}
                  </span>{' '}
                  {isBn ? 'টি পোস্ট (সর্বমোট' : 'of'}{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {totalPosts}
                  </span>
                  {isBn ? 'টি)' : ' posts'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  className="text-xs h-7"
                >
                  {isBn ? 'পূর্ববর্তী' : 'Previous'}
                </Button>

                <span className="font-medium text-slate-700 dark:text-slate-300 px-2">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || isLoading}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  className="text-xs h-7"
                >
                  {isBn ? 'পরবর্তী' : 'Next'}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <FeedEmptyState onResetFilters={handleResetFilters} />
      )}

      {/* 5. Content Detail View Drawer */}
      <FeedDetailDrawer
        post={selectedPost}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onReject={handleReject}
        onUpdate={handleUpdate}
        initialEditMode={initialEditMode}
      />
    </div>
  );
};

export default FeedPage;
