import React from 'react';
import {
  ComplaintInfoSection as BaseComplaintInfoSection,
  ComplaintInfoSectionProps,
} from './ComplaintInfoSection';
import { HarassmentContextCard } from './HarassmentContextCard';
import { cn } from '@/utils';

export const ComplaintInfoSectionWithHarassmentContext: React.FC<ComplaintInfoSectionProps> = ({
  className,
  ...props
}) => (
  <div className={cn('space-y-6', className)}>
    <BaseComplaintInfoSection {...props} />
    <HarassmentContextCard complaint={props.complaint} />
  </div>
);

export default ComplaintInfoSectionWithHarassmentContext;
