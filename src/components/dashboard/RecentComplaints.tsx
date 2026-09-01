import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableLoadingRow,
  TableEmptyRow,
} from '@/components/ui/Table';
import { Badge, BadgeStatus } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { RecentComplaintItem, LifecycleStatusKey } from '@/types/Dashboard';
import { AlertCircle, Eye, ArrowRight, MapPin } from 'lucide-react';

export interface RecentComplaintsProps {
  complaints: RecentComplaintItem[];
  loading?: boolean;
}

export const RecentComplaints: React.FC<RecentComplaintsProps> = ({ complaints, loading }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const statusBadgeMap: Record<LifecycleStatusKey, { badgeStatus: BadgeStatus; labelEn: string; labelBn: string }> = {
    submitted: { badgeStatus: 'pending', labelEn: 'Submitted', labelBn: 'দাখিলকৃত' },
    published: { badgeStatus: 'published', labelEn: 'Published', labelBn: 'প্রকাশিত' },
    rejected: { badgeStatus: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিলকৃত' },
    edited: { badgeStatus: 'info', labelEn: 'Edited', labelBn: 'সম্পাদিত' },
  };

  const handleView = (id: string) => {
    navigate(`/complaints/${id}`);
  };

  return (
    <Card variant="default" className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <CardTitle className="text-sm font-semibold">
              {isBn ? 'সাম্প্রতিক নাগরিক অভিযোগ তালিকা' : 'Recent Citizen Complaints'}
            </CardTitle>
          </div>
          <CardDescription>
            {isBn
              ? 'সার্বক্ষণিক ইনকামিং অভিযোগ ট্রায়াজ ও প্রাথমিক নিরীক্ষণ'
              : 'Latest operational complaint intake queue across metropolitan wards'}
          </CardDescription>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/complaints')}
          className="text-xs self-start sm:self-auto"
        >
          <span>{isBn ? 'সব অভিযোগ দেখুন' : 'View All Complaints'}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Desktop / Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{isBn ? 'অভিযোগ আইডি' : 'Complaint ID'}</TableHead>
                <TableHead>{isBn ? 'শিরোনাম ও বিভাগ' : 'Title & Category'}</TableHead>
                <TableHead>{isBn ? 'অবস্থান' : 'Location'}</TableHead>
                <TableHead className="w-[110px]">{isBn ? 'সময়' : 'Date'}</TableHead>
                <TableHead className="w-[120px]">{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                <TableHead className="w-[80px] text-right">{isBn ? 'অ্যাকশন' : 'Action'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRow
                  colSpan={6}
                  message={isBn ? 'অভিযোগ লোড হচ্ছে...' : 'Loading recent complaints...'}
                />
              ) : complaints.length === 0 ? (
                <TableEmptyRow
                  colSpan={6}
                  title={isBn ? 'কোন অভিযোগ নেই' : 'No recent complaints'}
                  description={
                    isBn
                      ? 'বর্তমানে কোনো ইনকামিং অভিযোগ জমা হয়নি।'
                      : 'No complaints have been logged in this timeframe.'
                  }
                />
              ) : (
                complaints.map((item) => {
                  const statusConfig = statusBadgeMap[item.status] || {
                    badgeStatus: 'default',
                    labelEn: item.status,
                    labelBn: item.status,
                  };

                  const title = isBn ? item.titleBn : item.titleEn;
                  const category = isBn ? item.categoryBn : item.categoryEn;
                  const location = isBn ? item.locationBn : item.locationEn;

                  return (
                    <TableRow key={item.id} className="group">
                      {/* Complaint ID */}
                      <TableCell className="font-mono font-semibold text-sky-700 dark:text-sky-400 text-xs">
                        {item.id}
                      </TableCell>

                      {/* Title & Category */}
                      <TableCell className="max-w-xs md:max-w-md">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {title}
                          </p>
                          <span className="inline-block text-[11px] text-slate-500 dark:text-slate-400">
                            {category}
                          </span>
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{location}</span>
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {item.date}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge status={statusConfig.badgeStatus} size="sm" dot>
                          {isBn ? statusConfig.labelBn : statusConfig.labelEn}
                        </Badge>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(item.id)}
                          className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400"
                          title={isBn ? 'বিস্তারিত দেখুন' : 'View details'}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>{isBn ? 'দেখুন' : 'View'}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-slate-800 rounded-lg">
              {isBn ? 'বর্তমানে কোনো ইনকামিং অভিযোগ জমা হয়নি।' : 'No recent complaints logged.'}
            </div>
          ) : (
            complaints.map((item) => {
              const statusConfig = statusBadgeMap[item.status] || {
                badgeStatus: 'default',
                labelEn: item.status,
                labelBn: item.status,
              };

              const title = isBn ? item.titleBn : item.titleEn;
              const category = isBn ? item.categoryBn : item.categoryEn;
              const location = isBn ? item.locationBn : item.locationEn;

              return (
                <div
                  key={item.id}
                  onClick={() => handleView(item.id)}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 active:bg-slate-50/50 dark:active:bg-slate-800/50 cursor-pointer space-y-2.5 shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400 text-xs">
                      {item.id}
                    </span>
                    <Badge status={statusConfig.badgeStatus} size="sm" dot>
                      {isBn ? statusConfig.labelBn : statusConfig.labelEn}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {title}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 truncate max-w-[180px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{location}</span>
                    </div>
                    <span>{item.date}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentComplaints;
