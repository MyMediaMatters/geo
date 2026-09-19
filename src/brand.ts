import type { GeoBrand } from './types';

/**
 * Was the brand named, and was its own site cited?
 *
 * The two are deliberately separate. Being named in an answer is worth
 * something; being the SOURCE the answer cites is worth more, and it is the one
 * that moves when the site improves. Collapsing them into one "visible" boolean
 * would hide the only number that responds to the work.
 */
export function detect(
  answer: string,
  sources: string[],
  brand: GeoBrand
): { mentioned: boolean; cited: boolean } {
  const cited = sources.some((u) => brand.domain.test(u));
  return { mentioned: brand.mention.test(answer) || cited, cited };
}

/**
 * A short, human-readable excerpt — the sentence that names the brand where
 * there is one, so a reader can see the context rather than a truncated opener.
 */
export function makeExcerpt(answer: string, brand: GeoBrand): string {
  const clean = answer.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const hit = sentences.find((s) => brand.mention.test(s));
  const text = hit || clean;
  return text.length > 280 ? text.slice(0, 277) + '…' : text;
}

export function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}
