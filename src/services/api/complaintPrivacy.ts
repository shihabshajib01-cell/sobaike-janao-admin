import {
  ComplaintPrivacyChoice,
  ComplaintPublicationPreferences,
} from '@/types/Complaint';

/**
 * Preserve the citizen-selected privacy mode exactly as stored.
 * Unknown or legacy values remain unspecified rather than being coerced.
 */
export function parseComplaintPrivacyChoice(
  value: string | null | undefined
): ComplaintPrivacyChoice | undefined {
  return value === 'anonymous' || value === 'admin_only' || value === 'public_identity'
    ? value
    : undefined;
}

/**
 * Preserve only explicitly supplied publication preferences and public-presentation
 * values. Missing consent keys are intentionally not defaulted because doing so
 * would invent publication consent that the citizen did not submit.
 */
export function parseComplaintPublicationPreferences(
  value: Record<string, unknown> | null | undefined
): ComplaintPublicationPreferences | undefined {
  if (!value) return undefined;

  const parsed: ComplaintPublicationPreferences = {};

  if (typeof value.showSubjectName === 'boolean') {
    parsed.showSubjectName = value.showSubjectName;
  }
  if (typeof value.showOrganization === 'boolean') {
    parsed.showOrganization = value.showOrganization;
  }
  if (typeof value.showGeneralLocation === 'boolean') {
    parsed.showGeneralLocation = value.showGeneralLocation;
  }
  if (typeof value.showDescription === 'boolean') {
    parsed.showDescription = value.showDescription;
  }

  if (typeof value.publicTitleBn === 'string' && value.publicTitleBn.trim()) {
    parsed.publicTitleBn = value.publicTitleBn.trim();
  }
  if (typeof value.publicTitleEn === 'string' && value.publicTitleEn.trim()) {
    parsed.publicTitleEn = value.publicTitleEn.trim();
  }
  if (typeof value.publicSummaryBn === 'string' && value.publicSummaryBn.trim()) {
    parsed.publicSummaryBn = value.publicSummaryBn.trim();
  }
  if (typeof value.publicSummaryEn === 'string' && value.publicSummaryEn.trim()) {
    parsed.publicSummaryEn = value.publicSummaryEn.trim();
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}
