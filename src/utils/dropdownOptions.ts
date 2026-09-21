export interface LabeledDropdownOption {
  label: string;
}

/**
 * Alphabetically sorts human-readable text options for the current UI language.
 * Numeric/time-range controls should keep their logical order and must not use this helper.
 */
export function sortLocalizedTextOptions<T extends LabeledDropdownOption>(
  options: T[],
  language: 'en' | 'bn'
): T[] {
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';

  return [...options].sort((a, b) =>
    a.label.localeCompare(b.label, locale, {
      sensitivity: 'base',
      numeric: true,
    })
  );
}
