import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { LocationPermissionStatus } from '@/types/LocationActivity';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { Tag, TagTone } from '@/components/ui/Tag';

export interface LocationPermissionBadgeProps {
  status: LocationPermissionStatus;
  className?: string;
}

export const LocationPermissionBadge: React.FC<LocationPermissionBadgeProps> = ({
  status,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const normalized = (status || '').toLowerCase().trim();

  const config: Record<
    string,
    {
      tone: TagTone;
      icon?: React.ReactNode;
      label: string;
    }
  > = {
    granted: {
      tone: 'success',
      icon: <CheckCircle2 />,
      label: isBn ? 'অনুমোদিত' : 'Granted',
    },
    denied: {
      tone: 'danger',
      icon: <XCircle />,
      label: isBn ? 'অনুমতি দেওয়া হয়নি' : 'Denied',
    },
    prompt: {
      tone: 'warning',
      icon: <AlertCircle />,
      label: isBn ? 'এখন নয়' : 'Not Now',
    },
    unavailable: {
      tone: 'neutral',
      icon: <HelpCircle />,
      label: isBn ? 'অনুপলব্ধ' : 'Unavailable',
    },
  };

  const selected = config[normalized] || {
    tone: 'neutral' as TagTone,
    label: status || '—',
  };

  return (
    <Tag
      tone={selected.tone}
      icon={selected.icon}
      className={className}
    >
      {selected.label}
    </Tag>
  );
};

export default LocationPermissionBadge;
