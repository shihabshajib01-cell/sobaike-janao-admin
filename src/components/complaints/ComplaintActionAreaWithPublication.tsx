import React from 'react';
import {
  Complaint,
  ComplaintTimelineEvent,
} from '@/types/Complaint';
import {
  ComplaintActionArea as ModerationActionArea,
} from './ComplaintActionArea';
import { PublicationEditorLauncher } from './PublicationEditorLauncher';

export interface ComplaintActionAreaWithPublicationProps {
  complaint: Complaint;
  className?: string;
  onComplaintUpdated?: (
    complaint: Complaint,
    timeline: ComplaintTimelineEvent[],
    timelineError?: string | null
  ) => void;
}

/**
 * Complaint workflow composition.
 * Publishing is intentionally separated from generic moderation actions so an
 * administrator must review the public presentation before a report goes live.
 */
export const ComplaintActionArea: React.FC<ComplaintActionAreaWithPublicationProps> = ({
  complaint,
  className,
  onComplaintUpdated,
}) => {
  return (
    <div className="space-y-6">
      <PublicationEditorLauncher
        complaint={complaint}
        onComplaintUpdated={onComplaintUpdated}
      />
      <ModerationActionArea
        complaint={complaint}
        className={className}
        onComplaintUpdated={onComplaintUpdated}
      />
    </div>
  );
};

export default ComplaintActionArea;
