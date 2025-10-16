// src/lib/slug.ts
// Existing English slugify (keep yours if you already have it)
export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Arabic-friendly slugify:
 * - Keeps Arabic letters and numbers
 * - Removes Arabic diacritics (tashkīl)
 * - Replaces spaces/punctuation with hyphens
 */
export function slugifyAr(input: string) {
  const AR_DIACRITICS =
    /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08E4-\u08FF]/g;
  return input
    .trim()
    .replace(AR_DIACRITICS, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-") // keep letters (including Arabic) + numbers
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
