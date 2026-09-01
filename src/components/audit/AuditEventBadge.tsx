import React from 'react';
import { Badge, BadgeStatus, BadgeSize } from '@/components/ui/Badge';
import { AuditAction } from '@/types/AuditLog';
import { useLanguage } from '@/context/LanguageContext';

export interface AuditEventBadgeProps {
  action: AuditAction;
  size?: BadgeSize;
  className?: string;
}

const ACTION_CONFIG: Record<
  string,
  {
    status: BadgeStatus;
    labelEn: string;
    labelBn: string;
  }
> = {
  approve: {
    status: 'approved',
    labelEn: 'Approve',
    labelBn: 'অনুমোদন',
  },
  reject: {
    status: 'rejected',
    labelEn: 'Reject',
    labelBn: 'বাতিল',
  },
  publish: {
    status: 'published',
    labelEn: 'Publish',
    labelBn: 'প্রকাশ',
  },
  resolve: {
    status: 'resolved',
    labelEn: 'Resolve',
    labelBn: 'সমাধান',
  },
  status_change: {
    status: 'review',
    labelEn: 'Status Change',
    labelBn: 'স্ট্যাটাস পরিবর্তন',
  },
  role_change: {
    status: 'info',
    labelEn: 'Role Change',
    labelBn: 'রোল পরিবর্তন',
  },
  create: {
    status: 'approved',
    labelEn: 'Create',
    labelBn: 'তৈরি',
  },
  update: {
    status: 'pending',
    labelEn: 'Update',
    labelBn: 'হালনাগাদ',
  },
  deactivate: {
    status: 'default',
    labelEn: 'Deactivate',
    labelBn: 'নিষ্ক্রিয়',
  },
  export: {
    status: 'default',
    labelEn: 'Export',
    labelBn: 'এক্সপোর্ট',
  },
};

export const AuditEventBadge: React.FC<AuditEventBadgeProps> = ({
  action,
  size = 'sm',
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const config = ACTION_CONFIG[action.toLowerCase()] || {
    status: 'default',
    labelEn: action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' '),
    labelBn: action,
  };

  return (
    <Badge
      status={config.status}
      size={size}
      variant="subtle"
      className={className}
    >
      {isBn ? config.labelBn : config.labelEn}
    </Badge>
  );
};

export default AuditEventBadge;
