import React, { forwardRef, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils';
import { LoadingState } from '@/components/common/LoadingState';

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
  bare?: boolean;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, bare = false, ...props }, ref) => (
    <div
      className={cn(
        'relative w-full max-w-full min-w-0 overflow-x-auto',
        !bare && 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs',
        containerClassName
      )}
    >
      <table
        ref={ref}
        className={cn('w-max min-w-full table-auto caption-bottom type-table text-left', className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800', className)}
      {...props}
    />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-slate-100 dark:divide-slate-800/60', className)} {...props} />
  )
);
TableBody.displayName = 'TableBody';

export const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('bg-slate-50 dark:bg-slate-800/60 font-medium border-t border-slate-200 dark:border-slate-800', className)}
      {...props}
    />
  )
);
TableFooter.displayName = 'TableFooter';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-slate-800',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sortDirection, onSort, ...props }, ref) => (
    <th
      ref={ref}
      onClick={sortable ? onSort : undefined}
      className={cn(
        'h-9 px-3.5 text-left align-middle font-semibold text-slate-600 dark:text-slate-400 type-table uppercase tracking-wider whitespace-nowrap select-none',
        sortable && 'cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        <span>{children}</span>
        {sortable && (
          <span className="text-slate-400 dark:text-slate-500">
            {sortDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            ) : sortDirection === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
            )}
          </span>
        )}
      </div>
    </th>
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('p-3.5 align-middle text-slate-700 dark:text-slate-300 font-normal leading-normal', className)}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';

export const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-3 type-meta text-slate-400 dark:text-slate-500', className)} {...props} />
  )
);
TableCaption.displayName = 'TableCaption';

/**
 * Table Loading Wrapper
 */
export const TableLoadingRow: React.FC<{ colSpan: number; message?: string }> = ({
  colSpan,
  message = 'Loading table records...',
}) => (
  <tr>
    <td colSpan={colSpan} className="py-12 text-center">
      <LoadingState message={message} size="md" />
    </td>
  </tr>
);
