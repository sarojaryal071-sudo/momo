// Launch blockers: text that must not remain on an indexable site (SEO rulebook section 2, D-052).
export function launchBlockers(html) {
  const found = [];
  if (/TODO:/.test(html)) found.push('TODO: text');
  if (/\bdata-pending\b/.test(html)) found.push('data-pending element');
  return found;
}

// Seed data marked as sample values.
export const hasPlaceholderData = (json) => /"(?:[a-z]+_)?pending"\s*:\s*true/.test(json); // also "stock_pending"
