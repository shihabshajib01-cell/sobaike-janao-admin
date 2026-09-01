import React from 'react';
import { UserStatus } from '@/types/User';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';

export interface UserStatusBadgeProps {
  status: UserStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({
  status,
  size = 'sm',
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  switch (status.toLowerCase()) {
    case 'active':
      return (
        <Badge status="approved" size={size} dot className={className}>
          {isBn ? 'সক্রিয়' : 'Active'}
        </Badge>
      );
    case 'pending':
      return (
        <Badge status="pending" size={size} dot className={className}>
          {isBn ? 'অপেক্ষমাণ' : 'Pending'}
        </Badge>
      );
    case 'suspended':
      return (
        <Badge status="rejected" size={size} dot className={className}>
          {isBn ? 'স্থগিত' : 'Suspended'}
        </Badge>
      );
    case 'inactive':
    default:
      return (
        <Badge status="default" size={size} dot className={className}>
          {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
        </Badge>
      );
  }
};

export default UserStatusBadge;
