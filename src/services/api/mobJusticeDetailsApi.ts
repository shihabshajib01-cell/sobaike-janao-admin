import { supabase } from '@/lib/supabase';
import {
  MobJusticeDetails,
  MobJusticeOngoingStatus,
  MobJusticeOutcome,
  MobJusticeSpread,
  MobJusticeTrigger,
} from '@/types/Complaint';

const VALID_TRIGGERS = new Set<MobJusticeTrigger>([
  'suspected_theft_robbery',
  'snatching_allegation',
  'kidnapping_allegation',
  'sexual_offence_allegation',
  'religious_sentiment_allegation',
  'personal_local_dispute',
  'informal_punishment',
  'other_accusation_dispute',
  'unknown',
]);

const VALID_SPREADS = new Set<MobJusticeSpread>([
  'direct_accusation',
  'word_of_mouth',
  'social_media',
  'message_group_post',
  'loudspeaker_announcement',
  'local_arbitration_meeting',
  'organized_gathering',
  'unknown',
  'other',
]);

const VALID_OUTCOMES = new Set<MobJusticeOutcome>([
  'threatened_harassed',
  'restrained_surrounded',
  'physically_assaulted',
  'seriously_injured',
  'death_reported',
  'property_damaged',
  'rescued_intervention',
  'ongoing',
  'unknown',
]);

const VALID_ONGOING_STATUSES = new Set<MobJusticeOngoingStatus>(['ongoing', 'ended', 'unknown']);

function parseMobJusticeDetails(value: unknown): MobJusticeDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const trigger = raw.trigger;
  const spread = raw.spread;
  const outcome = raw.outcome;
  const ongoingStatus = raw.ongoingStatus;
  const targetedCount = raw.targetedCount;

  if (typeof trigger !== 'string' || !VALID_TRIGGERS.has(trigger as MobJusticeTrigger)) return null;
  if (typeof outcome !== 'string' || !VALID_OUTCOMES.has(outcome as MobJusticeOutcome)) return null;
  if (
    typeof ongoingStatus !== 'string' ||
    !VALID_ONGOING_STATUSES.has(ongoingStatus as MobJusticeOngoingStatus)
  ) {
    return null;
  }

  if (spread !== undefined && spread !== null) {
    if (typeof spread !== 'string' || !VALID_SPREADS.has(spread as MobJusticeSpread)) return null;
  }

  let parsedTargetedCount: number | null = null;
  if (targetedCount !== undefined && targetedCount !== null) {
    const numericCount = Number(targetedCount);
    if (!Number.isInteger(numericCount) || numericCount < 1 || numericCount > 9999) return null;
    parsedTargetedCount = numericCount;
  }

  return {
    trigger: trigger as MobJusticeTrigger,
    spread: (spread as MobJusticeSpread | null | undefined) ?? null,
    outcome: outcome as MobJusticeOutcome,
    targetedCount: parsedTargetedCount,
    ongoingStatus: ongoingStatus as MobJusticeOngoingStatus,
  };
}

export async function getComplaintMobJusticeDetails(
  complaintId: string
): Promise<MobJusticeDetails | null> {
  const normalizedId = complaintId.trim();
  if (!normalizedId) return null;

  const { data, error } = await supabase
    .from('complaints')
    .select('segment_id, subcategory_id, mob_justice_details')
    .eq('id', normalizedId)
    .maybeSingle();

  if (error) {
    console.warn('[mobJusticeDetailsApi] Failed to load Mob Justice details:', error.message);
    return null;
  }

  if (!data || data.segment_id !== 'public_safety' || data.subcategory_id !== 'mob-justice') {
    return null;
  }

  return parseMobJusticeDetails(data.mob_justice_details);
}
