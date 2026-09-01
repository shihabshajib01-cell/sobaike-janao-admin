import React, { useState, useEffect, useCallback } from 'react';
import { MapComplaint, MapFilterState, MapSummary } from '@/types/Map';
import { Category, Subcategory } from '@/types/Category';
import { ComplaintLifecycleStatus } from '@/types/Complaint';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DownloadMenu } from '@/components/ui/DownloadMenu';
import { Card, CardContent } from '@/components/ui/Card';
import {
  MapContainer,
  MapFilters,
  MapLegend,
  LocationSummary,
  MapComplaintList,
  MapEmptyState,
} from '@/components/map';
import { mapApi, categoryApi } from '@/services/api';
import { RefreshCw, Map as MapIcon, List, Eye } from 'lucide-react';
import { cn, exportMapComplaintsToCsv, exportMapComplaintsToPdf } from '@/utils';

const INITIAL_FILTERS: MapFilterState = {
  searchQuery: '',
  category: 'all',
  subcategory: 'all',
  status: 'all',
  ward: 'all',
  zone: 'all',
  dateRange: 'all',
};

export const MapPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Data states
  const [complaints, setComplaints] = useState<MapComplaint[]>([]);
  const [summary, setSummary] = useState<MapSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [availableWards, setAvailableWards] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filter state
  const [filters, setFilters] = useState<MapFilterState>(INITIAL_FILTERS);

  // Selected complaint on map
  const [selectedComplaint, setSelectedComplaint] = useState<MapComplaint | null>(null);

  // Mobile View Switcher Tab ('map' | 'list')
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Load initial taxonomy & location metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [cats, subs, locs] = await Promise.all([
          categoryApi.getCategories(),
          categoryApi.getSubcategories(),
          mapApi.getAvailableLocations(),
        ]);
        setCategories(cats);
        setSubcategories(subs);
        setAvailableWards(locs.wards);
      } catch (err) {
        console.error('Failed to load map metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch complaints and summary based on filters
  const loadMapData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await mapApi.getMapComplaints(filters);
        setComplaints(data);

        const sum = await mapApi.getMapSummary(data);
        setSummary(sum);

        // If selected complaint is no longer in filtered list, deselect
        if (selectedComplaint && !data.some((c) => c.id === selectedComplaint.id)) {
          setSelectedComplaint(null);
        }
      } catch (err) {
        console.error('Failed to fetch map complaints:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, selectedComplaint]
  );

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Handlers
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSelectedComplaint(null);
  };

  const handleSelectStatusFromLegend = (status: ComplaintLifecycleStatus | 'all') => {
    setFilters((prev) => ({
      ...prev,
      status,
    }));
  };

  const handleSelectComplaintFromList = (complaint: MapComplaint) => {
    setSelectedComplaint((prev) => (prev?.id === complaint.id ? null : complaint));
    // On mobile, if an item is selected from list, switch to map view to inspect
    if (window.innerWidth < 1024) {
      setMobileTab('map');
    }
  };

  const handleExportCsv = () => {
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'সিএসভি হচ্ছে...' : 'Generating CSV...');
      
      if (complaints.length === 0) {
        setExportMessage(isBn ? 'কোনো ডাটা নেই' : 'No data');
        setTimeout(() => setExportMessage(null), 2500);
        setIsExporting(false);
        return;
      }

      const success = exportMapComplaintsToCsv(
        complaints,
        `sobaike_map_data_${filters.ward !== 'all' ? filters.ward + '_' : ''}${new Date().toISOString().slice(0, 10)}.csv`
      );

      if (success) {
        setExportMessage(isBn ? 'রপ্তানি সম্পন্ন!' : 'CSV Exported!');
      } else {
        setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export map complaints CSV:', err);
      setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'পিডিএফ হচ্ছে...' : 'Generating PDF...');
      
      if (complaints.length === 0) {
        setExportMessage(isBn ? 'কোনো ডাটা নেই' : 'No data');
        setTimeout(() => setExportMessage(null), 2500);
        setIsExporting(false);
        return;
      }

      const success = exportMapComplaintsToPdf(
        complaints,
        {
          ward: filters.ward,
          status: filters.status,
        },
        `sobaike_geospatial_report_${filters.ward !== 'all' ? filters.ward + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`
      );

      if (success) {
        setExportMessage(isBn ? 'পিডিএফ সম্পন্ন!' : 'PDF Exported!');
      } else {
        setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export map complaints PDF:', err);
      setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Compute status counts for legend
  const legendCounts: Record<ComplaintLifecycleStatus | 'all', number> = {
    all: complaints.length,
    submitted: complaints.filter((c) => c.status === 'submitted').length,
    published: complaints.filter((c) => c.status === 'published').length,
    rejected: complaints.filter((c) => c.status === 'rejected').length,
    edited: complaints.filter((c) => c.status === 'edited').length,
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title={isBn ? 'ম্যাপ মনিটরিং' : 'Map Monitoring'}
        description={
          isBn
            ? 'অবস্থানভিত্তিক নাগরিক অভিযোগ কার্যক্রম ও ক্লাস্টার পর্যবেক্ষণ।'
            : 'Monitor complaint activity by location.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadMapData(true)}
              disabled={refreshing || loading}
              leftIcon={
                <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              }
            >
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
            <DownloadMenu
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              isExporting={isExporting}
              exportMessage={exportMessage}
              label={isBn ? 'রপ্তানি' : 'Export'}
              variant="secondary"
              size="sm"
            />
          </div>
        }
      />

      {/* 2. Summary KPI Cards */}
      <LocationSummary summary={summary} loading={loading && !refreshing} />

      {/* 3. Filters Panel */}
      <MapFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        categories={categories}
        subcategories={subcategories}
        availableWards={availableWards}
        totalResultsCount={complaints.length}
      />

      {/* Mobile / Small Screen Segmented Toggle (Map vs List) */}
      <div className="flex lg:hidden items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all',
            mobileTab === 'map'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>{isBn ? 'মানচিত্র ভিউ' : 'Map View'}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all',
            mobileTab === 'list'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <List className="w-3.5 h-3.5" />
          <span>{isBn ? 'তালিকা ভিউ' : 'List View'}</span>
          <span className="ml-1 text-[10px] font-mono px-1 rounded bg-slate-200 dark:bg-slate-700">
            {complaints.length}
          </span>
        </button>
      </div>

      {/* 4. Main Two-Column Layout (Map on Left, Complaint List on Right) */}
      {complaints.length === 0 && !loading ? (
        <Card variant="default">
          <CardContent className="p-4">
            <MapEmptyState
              hasActiveFilters={Boolean(
                filters.searchQuery ||
                filters.category !== 'all' ||
                filters.status !== 'all' ||
                filters.ward !== 'all'
              )}
              onResetFilters={handleResetFilters}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left / Primary Column: Map Container & Legend */}
          <div
            className={cn(
              'space-y-3.5',
              'lg:col-span-8',
              mobileTab === 'map' ? 'block' : 'hidden lg:block'
            )}
          >
            <MapContainer
              complaints={complaints}
              selectedComplaint={selectedComplaint}
              onSelectComplaint={setSelectedComplaint}
              loading={loading}
            />

            {/* Map Status Legend underneath */}
            <MapLegend
              selectedStatus={filters.status}
              onSelectStatus={handleSelectStatusFromLegend}
              counts={legendCounts}
            />
          </div>

          {/* Right Column: Geolocated Complaint List */}
          <div
            className={cn(
              'lg:col-span-4',
              mobileTab === 'list' ? 'block' : 'hidden lg:block'
            )}
          >
            <MapComplaintList
              complaints={complaints}
              selectedId={selectedComplaint?.id || null}
              onSelectComplaint={handleSelectComplaintFromList}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
