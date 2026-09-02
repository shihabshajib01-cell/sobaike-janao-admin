import React from 'react';
import { Card } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from '@/components/ui/Table';
import { useLanguage } from '@/context/LanguageContext';

export const RoleLoadingSkeleton: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className="space-y-4">
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">{isBn ? 'ভূমিকার নাম' : 'Role Name'}</TableHead>
              <TableHead className="w-[120px]">{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
              <TableHead className="w-[150px]">{isBn ? 'অনুমতি' : 'Permissions'}</TableHead>
              <TableHead className="w-[160px]">{isBn ? 'বরাদ্দকৃত ব্যবহারকারী' : 'Assigned Users'}</TableHead>
              <TableHead className="w-[140px]">{isBn ? 'তৈরির তারিখ' : 'Created'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((index) => (
              <TableRow key={index} className="animate-pulse">
                <td className="p-3.5 align-middle">
                  <div className="space-y-2">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                </td>
                <td className="p-3.5 align-middle">
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </td>
                <td className="p-3.5 align-middle">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </td>
                <td className="p-3.5 align-middle">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                </td>
                <td className="p-3.5 align-middle">
                  <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                </td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map((index) => (
          <Card
            key={index}
            className="p-4 space-y-3 animate-pulse border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoleLoadingSkeleton;
