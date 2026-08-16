/**
 * Bank exports carry dates, reference numbers and store codes that add noise
 * without adding meaning. Strip them so the rule table matches on words alone.
 */
export function normalize(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\d{1,4}[/-]\d{1,2}(?:[/-]\d{2,4})?/g, ' ')
    .replace(/#\s*\w+/g, ' ')
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
