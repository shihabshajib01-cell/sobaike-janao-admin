import { supabase } from '@/lib/supabase';

export interface ComplaintHarassmentContext {
  relationshipContext: string | null;
  intimateWhatHappened: string | null;
  intimatePlatform: string | null;
}

function normalizeJsonText(value: unknown): string | null {
  if (typeof value === 'string') {
    const clean = value.trim();
    return clean || null;
  }
  if (value === null || value === undefined) return null;
  return String(value);
}

export async function getComplaintHarassmentContext(
  complaintId: string
): Promise<ComplaintHarassmentContext | null> {
  const { data, error } = await supabase
    .from('complaints')
    .select('relationship_context, intimate_what_happened, intimate_platform')
    .eq('id', complaintId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load harassment context');
  }

  if (!data) return null;

  return {
    relationshipContext: normalizeJsonText(data.relationship_context),
    intimateWhatHappened: normalizeJsonText(data.intimate_what_happened),
    intimatePlatform: normalizeJsonText(data.intimate_platform),
  };
}
