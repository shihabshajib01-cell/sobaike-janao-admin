/**
 * Common formatting helpers
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString();
  } catch {
    return dateString;
  }
};

