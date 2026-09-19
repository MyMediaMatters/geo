/**
 * The shapes every client shares.
 *
 * Everything client-specific lives in `GeoBrand` and nowhere else. That is the
 * whole point of this package: the two hand-copied versions it replaces —
 * asom-site and american-roofing — had the brand baked into the library, so
 * every client needed a fork, and the forks drifted.
 */

export type Engine = 'claude' | 'perplexity' | 'openai';

export const ENGINE_LABELS: Record<Engine, string> = {
  claude: 'Claude',
  perplexity: 'Perplexity',
  openai: 'ChatGPT',
};

/**
 * Who we are looking for in an answer, and what kind of business they are.
 *
 * `kind` exists because of a real bug this package was written to make
 * impossible. American Roofing's copy was ported from a med-spa client, and its
 * competitor-extraction prompt still asked the model to
 * "list the specific businesses / med spas / practices it recommends" — on a
 * commercial roofing account. Nobody saw it because the output still looked
 * like a list of businesses. Naming the vertical as data means a port cannot
 * leave the previous client's wording behind.
 */
export interface GeoBrand {
  /** Display name, as a customer would say it. */
  name: string;
  /** Matches the brand in an answer's prose. */
  mention: RegExp;
  /** Matches the brand's own domain in a source URL — this is what "cited" means. */
  domain: RegExp;
  /**
   * The kind of business, plural, as a buyer would say it:
   * "commercial roofing contractors", "med spas", "destinations".
   * Used verbatim in the extraction prompt.
   */
  kind: string;
  /** Other names an answer might use, listed to the extractor. */
  aliases?: string[];
}

export interface GeoCheck {
  engine: Engine;
  mentioned: boolean;
  cited: boolean;
  excerpt: string;
  sources: string[];
  /** Full answer text — kept for competitor and rank extraction. */
  answer: string;
}

export interface Extraction {
  competitors: string[];
  rank: number | null;
}
