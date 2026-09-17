import React from 'react';
import {
  ComplaintInfoSection as BaseComplaintInfoSection,
  ComplaintInfoSectionProps,
} from './ComplaintInfoSection';
import { HarassmentContextCard } from './HarassmentContextCard';

export const ComplaintInfoSectionWithHarassmentContext: React.FC<ComplaintInfoSectionProps> = (
  props
) => (
  <div className="space-y-6">
    <BaseComplaintInfoSection {...props} className={undefined} />
    <HarassmentContextCard complaint={props.complaint} />
  </div>
);

export default ComplaintInfoSectionWithHarassmentContext;
