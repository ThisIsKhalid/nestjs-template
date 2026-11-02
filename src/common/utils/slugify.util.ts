/**
 * Generates an SEO-friendly URL slug from a string (e.g., product titles, categories).
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // decompose accents
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes
}

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return SLUG_REGEX.test(slug.trim());
}
